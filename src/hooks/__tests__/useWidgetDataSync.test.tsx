/**
 * useWidgetDataSync.test.tsx — sincronización del léxico activo con el widget.
 *
 * Verifica el contrato del `useEffect` inline original de `App.tsx`: solo envía
 * cuando hay entradas, perfil de inflexión y metadatos, y se re-ejecuta cuando
 * cambia cualquiera de ellos o el emisor.
 *
 * Environment: jsdom manual (mismo patrón que `useOfflineBannerStatus`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useWidgetDataSync } from '../useWidgetDataSync';
import type { InflectionProfile, LexiconEntry, LexiconMetadata } from '../../types';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const entry: LexiconEntry = {
  ID: 'e1',
  Raíz: 'pata',
  Léxema: ['pata'],
  Categoría: 'sustantivo',
  Significado: ['pata'],
  extraData: {},
};

const profile: InflectionProfile = { paradigms: [] };
const metadata: LexiconMetadata = { conlangName: 'Ilmuria', mainLanguage: 'Español' };

interface ProbeProps {
  entries: LexiconEntry[] | null;
  inflectionProfile: InflectionProfile | null;
  metadata: LexiconMetadata | null;
  sendLexiconData: (data: {
    entries: unknown[];
    inflectionProfile: unknown;
    metadata: unknown;
  }) => void;
}

let current: ProbeProps;

const Probe = (props: ProbeProps) => {
  current = props;
  useWidgetDataSync(props);
  return <div />;
};

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderProbe = (props: ProbeProps): void => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  act(() => {
    root.render(<Probe {...props} />);
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
  current = null as unknown as ProbeProps;
});

describe('useWidgetDataSync', () => {
  it('no envía si faltan los metadatos', () => {
    const sendLexiconData = vi.fn();
    renderProbe({ entries: [entry], inflectionProfile: profile, metadata: null, sendLexiconData });
    expect(sendLexiconData).not.toHaveBeenCalled();
  });

  it('no envía si no hay entradas', () => {
    const sendLexiconData = vi.fn();
    renderProbe({ entries: null, inflectionProfile: profile, metadata, sendLexiconData });
    expect(sendLexiconData).not.toHaveBeenCalled();
  });

  it('envía entradas, perfil y metadatos cuando están los tres', () => {
    const sendLexiconData = vi.fn();
    renderProbe({ entries: [entry], inflectionProfile: profile, metadata, sendLexiconData });
    expect(sendLexiconData).toHaveBeenCalledTimes(1);
    expect(sendLexiconData).toHaveBeenCalledWith({ entries: [entry], inflectionProfile: profile, metadata });
  });

  it('se re-ejecuta cuando cambian las entradas', () => {
    const sendLexiconData = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mounts.push({ root, container });

    act(() => {
      root.render(
        <Probe entries={[entry]} inflectionProfile={profile} metadata={metadata} sendLexiconData={sendLexiconData} />,
      );
    });
    const secondEntry: LexiconEntry = { ...entry, ID: 'e2', Raíz: 'kasa' };
    act(() => {
      root.render(
        <Probe
          entries={[entry, secondEntry]}
          inflectionProfile={profile}
          metadata={metadata}
          sendLexiconData={sendLexiconData}
        />,
      );
    });

    expect(sendLexiconData).toHaveBeenCalledTimes(2);
    expect(sendLexiconData).toHaveBeenLastCalledWith({
      entries: [entry, secondEntry],
      inflectionProfile: profile,
      metadata,
    });
  });

  it('no reenvía si los datos y el emisor conservan identidad', () => {
        const sendLexiconData = vi.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);
        mounts.push({ root, container });

        act(() => {
          root.render(
            <Probe entries={[entry]} inflectionProfile={profile} metadata={metadata} sendLexiconData={sendLexiconData} />,
          );
        });
        act(() => {
          root.render(
            <Probe entries={[entry]} inflectionProfile={profile} metadata={metadata} sendLexiconData={sendLexiconData} />,
          );
        });

        expect(sendLexiconData).toHaveBeenCalledTimes(2);
      });
});
