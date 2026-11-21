/**
 * dashboardNavigation.test.ts — mapeo nodo del canvas → destino de navegación.
 *
 * Cubre la regresión del `else` de `DashboardTab.handleModuleClick`: los nodos
 * del nivel léxico (`wordtypes`, `roots`, `entries`, `import`) se castiaban con
 * `moduleId as AppTabId` y colaban un tab inexistente al historial (la app
 * quedaba en blanco). Además verifica que TODOS los nodos del canvas tienen un
 * destino válido, para que añadir un nodo nuevo rompa este test y no la
 * navegación del usuario.
 */
import { describe, it, expect } from 'vitest';
import { resolveDashboardNavigation } from '../dashboardNavigation';
import { GRAMMAR_MODULES } from '../grammarTabModel';
import { GRAMMAR_NODES, LEXICON_NODES, ROOT_NODES } from '../graphCanvasModel';

describe('resolveDashboardNavigation', () => {
  it('los módulos de gramática abren el tab grammar', () => {
    for (const module of GRAMMAR_MODULES) {
      expect(resolveDashboardNavigation(module)).toEqual({ kind: 'grammar', module });
    }
  });

  it('los nodos del nivel léxico abren el tab table (antes: tab inválido)', () => {
    for (const nodeId of ['lexicon', 'wordtypes', 'roots', 'entries', 'import']) {
      expect(resolveDashboardNavigation(nodeId)).toEqual({ kind: 'tab', tab: 'table' });
    }
  });

  it('workbench/collections/neography/translator mapean a su tab', () => {
    expect(resolveDashboardNavigation('workbench')).toEqual({ kind: 'tab', tab: 'workbench' });
    expect(resolveDashboardNavigation('collections')).toEqual({ kind: 'tab', tab: 'collections' });
    expect(resolveDashboardNavigation('neography')).toEqual({ kind: 'tab', tab: 'writing' });
    expect(resolveDashboardNavigation('translator')).toEqual({ kind: 'tab', tab: 'translator' });
  });

  it('el nodo raíz grammar abre el tab grammar', () => {
    expect(resolveDashboardNavigation('grammar')).toEqual({ kind: 'tab', tab: 'grammar' });
  });

  it('todo nodo del canvas tiene un destino válido', () => {
    const allNodes = [...ROOT_NODES, ...GRAMMAR_NODES, ...LEXICON_NODES];
    expect(allNodes.length).toBeGreaterThan(0);
    for (const node of allNodes) {
      const target = resolveDashboardNavigation(node.id);
      expect(target, `nodo "${node.id}" sin destino`).not.toBeNull();
    }
  });

  it('los ids desconocidos devuelven null en vez de un tab inválido', () => {
    for (const value of ['', 'dashboard ', 'DASHBOARD', 'root', 'entries ', 'desconocido']) {
      expect(resolveDashboardNavigation(value), JSON.stringify(value)).toBeNull();
    }
  });
});
