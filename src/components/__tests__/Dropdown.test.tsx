// @vitest-environment jsdom
/** Dropdown: apertura, cierre al elegir una opción y soporte de teclado. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Dropdown, { DropdownItem } from '../Dropdown';

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, writable: true, configurable: true });

let container: HTMLDivElement;
let root: Root;

const render = async (onSelect: () => void): Promise<void> => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <Dropdown trigger={<span>Opciones</span>}>
        <DropdownItem onClick={onSelect}>Exportar</DropdownItem>
      </Dropdown>
    );
  });
};

const trigger = (): HTMLElement => {
  const found = document.querySelector('[role="button"]');
  if (!found) throw new Error('Dropdown trigger not found');
  return found as HTMLElement;
};

const menu = (): HTMLElement | null => document.querySelector('[role="menu"]');

const click = async (element: Element): Promise<void> => {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
};

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

describe('Dropdown', () => {
  it('abre el menú con el trigger y cierra al elegir una opción sin reabrirlo', async () => {
    const onSelect = vi.fn();
    await render(onSelect);

    expect(menu()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    await click(trigger());
    expect(menu()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    const item = document.querySelector('[role="menuitem"]');
    if (!item) throw new Error('Menu item not found');
    await click(item);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('cierra con clic fuera y se puede abrir con Enter', async () => {
    await render(vi.fn());

    await click(trigger());
    expect(menu()).not.toBeNull();

    await act(async () => {
      document.body.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    });
    expect(menu()).toBeNull();

    await act(async () => {
      trigger().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(menu()).not.toBeNull();
  });
});
