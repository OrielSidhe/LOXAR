/**
 * AppFloatingLayers.tsx
 * ─────────────────────
 * Capas flotantes/post-contenido del `return` de `App.tsx`, extraídas del
 * bloque del contenedor principal (P1 God Component).
 *
 * Agrupa la toolbar de acciones por lote (condicional al tab `table` con
 * selección activa), la capa de toasts, el widget flotante (que se portaliza a
 * `document.body`) y la capa de bootstrap de proyecto (condicional a no estar
 * en bienvenida ni en el wizard de primer arranque). El orden de render es
 * idéntico al original.
 *
 * Contratos preservados del `App.tsx` original:
 *  - `AppBatchToolbar` solo se monta con `activeTab === 'table'` y
 *    `selectedIds.size > 0`;
 *  - `AppProjectBootstrapLayer` solo se monta con `!showWelcome && !showWizard`;
 *  - `FloatingWidget` recibe los tres callbacks del widget bridge y los props
 *    con los que `App.tsx` lo montaba (`isCapturing`/`missingWords`/`lastResult`,
 *    hoy desconectados del bridge: deuda declarada, ver reporte).
 */
import React from 'react';
import type { AppTabId } from '../utils/appTabs';
import AppBatchToolbar from './AppBatchToolbar';
import AppToastLayer from './AppToastLayer';
import { FloatingWidget } from './FloatingWidget';
import AppProjectBootstrapLayer, { type AppProjectBootstrapLayerProps } from './AppProjectBootstrapLayer';

/** Props de la capa de bootstrap + las capas flotantes que la acompañan. */
export type AppFloatingLayersProps = AppProjectBootstrapLayerProps & {
  activeTab: AppTabId;
  selectedIds: Set<string>;
  customFunctions: string[];
  onClearSelection: () => void;
  onBatchDelete: () => void;
  onBatchChangeFunction: (fn: string) => void;
  notifications: { id: number; message: string; type: 'success' | 'error' }[];
  onDismissNotification: (id: number) => void;
  onWidgetAddWord: (word: string) => void;
  onWidgetSearch: (term: string) => void;
  onWidgetToggleCapture: () => void;
  showWelcome: boolean;
  showWizard: boolean;
};

const AppFloatingLayers: React.FC<AppFloatingLayersProps> = props => {
  const {
    activeTab,
    selectedIds,
    customFunctions,
    onClearSelection,
    onBatchDelete,
    onBatchChangeFunction,
    notifications,
    onDismissNotification,
    onWidgetAddWord,
    onWidgetSearch,
    onWidgetToggleCapture,
    showWelcome,
    showWizard,
    ...bootstrap
  } = props;

  return (
    <>
      {activeTab === 'table' && selectedIds.size > 0 && (
        <AppBatchToolbar
          selectedCount={selectedIds.size}
          customFunctions={customFunctions}
          onClearSelection={onClearSelection}
          onBatchDelete={onBatchDelete}
          onBatchChangeFunction={onBatchChangeFunction}
        />
      )}

      <AppToastLayer
        notifications={notifications}
        onDismissNotification={onDismissNotification}
      />

      {/* F1: Floating widget — persists position/dock state in localStorage */}
      <FloatingWidget
        isCapturing={false}
        missingWords={[]}
        onAddWord={onWidgetAddWord}
        onSearch={onWidgetSearch}
        onToggleCapture={onWidgetToggleCapture}
        lastResult={null}
      />

      {!showWelcome && !showWizard && <AppProjectBootstrapLayer {...bootstrap} />}
    </>
  );
};

AppFloatingLayers.displayName = 'AppFloatingLayers';

export default AppFloatingLayers;
