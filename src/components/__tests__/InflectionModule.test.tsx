// @vitest-environment jsdom
/**
 * InflectionModule.test.tsx — editor de morfologia (paradigmas + fonologia).
 *
 * Verifica el contrato del componente sin la capa de modales:
 *  - crea grupos y reglas simples;
 *  - guarda el perfil local por `onSave` y cierra por `onClose`;
 *  - aplica reglas fonologicas en la previsualizacion en vivo;
 *  - se sincroniza cuando el perfil cambia desde fuera (cambio de lexico).
 *
 * Environment: jsdom de vitest (el entorno manual con `createRoot` en Node no
 * registra `onChange` para inputs: `react-dom` se importa con `canUseDOM`
 * falso y el ChangeEventPlugin cae en el path de polyfill).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import InflectionModule, { type InflectionModuleProps } from '../InflectionModule';
import type { InflectionParadigm, InflectionProfile } from '../../types';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const group = (id: string, name: string): InflectionParadigm => ({ id, name, rules: [], paradigms: [] });

const baseProfile = (paradigms: InflectionParadigm[] = []): InflectionProfile => ({ paradigms });

const mounts: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

async function renderModule(
  profile: InflectionProfile,
  overrides: Partial<InflectionModuleProps> = {},
): Promise<{
  container: HTMLDivElement;
  root: ReturnType<typeof createRoot>;
  onSave: ReturnType<typeof vi.fn>;
  onClose: ReturnType<typeof vi.fn>;
}> {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  const props: InflectionModuleProps = { profile, onSave, onClose, ...overrides };
  await act(async () => {
    root.render(<InflectionModule {...props} />);
    await flush();
  });
  return { container, root, onSave, onClose };
}

const click = async (el: Element | null) => {
  if (!el) throw new Error('element not found');
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();
  });
};

const buttonByText = (container: HTMLElement, text: string): HTMLButtonElement | null =>
  Array.from(container.querySelectorAll('button')).find(button => button.textContent === text) ?? null;

const inputByPlaceholder = (container: HTMLElement, placeholder: string): HTMLInputElement | null =>
  container.querySelector(`input[placeholder="${placeholder}"]`);

const setTextInput = async (el: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    setter?.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flush();
  });
};

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
});

describe('InflectionModule', () => {
  it('muestra el dialogo y el estado vacio de paradigmas', async () => {
    const { container } = await renderModule(baseProfile());
    expect(container.textContent).toContain('Morfología y Flexión');
    expect(container.textContent).toContain('No hay paradigmas');
  });

  it('crea un grupo y lo lista', async () => {
    const { container } = await renderModule(baseProfile());
    await setTextInput(inputByPlaceholder(container, 'Nombre del paradigma (ej: 1ª conjugación)')!, '1ª conjugación');
    await click(buttonByText(container, '+ Grupo'));
    expect(container.textContent).toContain('1ª conjugación');
  });

  it('guarda el perfil local por onSave', async () => {
    const { container, onSave } = await renderModule(baseProfile());
    await setTextInput(inputByPlaceholder(container, 'Nombre del paradigma (ej: 1ª conjugación)')!, '1ª conjugación');
    await click(buttonByText(container, '+ Grupo'));
    await click(buttonByText(container, 'Guardar cambios'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as InflectionProfile;
    expect(saved.paradigms).toHaveLength(1);
    expect(saved.paradigms[0].name).toBe('1ª conjugación');
    expect(saved.paradigms[0].rules).toEqual([]);
  });

  it('cierra por onClose sin guardar', async () => {
    const { container, onClose, onSave } = await renderModule(baseProfile());
    await click(buttonByText(container, 'Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('abre el grupo y anade una regla simple', async () => {
    const { container } = await renderModule(baseProfile([group('g1', '1ª conjugación')]));

    await click(Array.from(container.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Abrir grupo') ?? null);
    await setTextInput(inputByPlaceholder(container, 'Nombre (ej: Plural)')!, 'Plural');
    await setTextInput(inputByPlaceholder(container, 'Plantilla con [RAÍZ]')!, '[RAÍZ]s');
    await click(buttonByText(container, '+ Añadir regla'));

    expect(container.textContent).toContain('Plural');
    expect(container.textContent).toContain('[RAÍZ]s');
  });

  it('previsualiza las reglas fonologicas en vivo', async () => {
    const { container } = await renderModule(baseProfile());

    await click(buttonByText(container, 'Reglas fonológicas'));
    await setTextInput(inputByPlaceholder(container, 'Nombre (ej: Nasalización)')!, 'S→H');
    await setTextInput(inputByPlaceholder(container, 'Patrón')!, 's');
    await setTextInput(inputByPlaceholder(container, 'Reemplazo')!, 'h');
    await click(buttonByText(container, '+ Añadir regla'));

    const previewInput = Array.from(container.querySelectorAll('input')).find(
      (input: HTMLInputElement) => input.value === 'entrada',
    ) as HTMLInputElement;
    await setTextInput(previewInput, 'sol');

    expect(container.querySelector('p.text-lg')?.textContent).toBe('hol');
  });

  it('se sincroniza cuando el perfil cambia desde fuera', async () => {
    const first = await renderModule(baseProfile([group('g1', 'Primero')]));
    expect(first.container.textContent).toContain('Primero');

    await act(async () => {
      first.root.render(
        <InflectionModule profile={baseProfile([group('g2', 'Segundo')])} onSave={vi.fn()} onClose={vi.fn()} />,
      );
      await flush();
    });

    expect(first.container.textContent).toContain('Segundo');
    expect(first.container.textContent).not.toContain('Primero');
  });
});
