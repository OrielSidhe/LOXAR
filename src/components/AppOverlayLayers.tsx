/**
 * AppOverlayLayers.tsx
 * ────────────────────
 * Capas superpuestas del área principal de `App.tsx`, extraídas del `return`
 * (P1 God Component).
 *
 * `App.tsx` montaba inline, antes del `Header`, seis capas apiladas: luces
 * ambientales, overlay de carga, banner de motor offline, banner del trabajo de
 * importación, la capa de modales (`ModalManager` + `AiSettingsModal`, chunk
 * lazy) y la capa de ajustes. Este componente concentra ese bloque con props
 * tipadas estrictamente y el mismo orden de render, para que `App.tsx` quede
 * como orquestador.
 *
 * Contratos preservados del `App.tsx` original:
 *  - el orden de las capas no cambia: `OfflineBanner` e `ImportJobBanner` son
 *    elementos en flujo dentro del contenedor flex, por lo que deben permanecer
 *    antes del `Header` (moverlos alteraría el layout);
 *  - `AppModalLayer` conserva su `Suspense` + chunks lazy y recibe el mismo
 *    `AppModalLayerProps` (incluido `onAiSettingsClose`);
 *  - `AppSettingsModalLayer` recibe `onOpenAiSettings` (antes opcional en su
 *    interfaz propia, aquí requerido porque `App.tsx` siempre lo provee).
 */
import React from 'react';
import type { ExportFormat } from '../utils/lexiconExport';
import AppAmbientLightsLayer from './AppAmbientLightsLayer';
import AppLoadingLayer from './AppLoadingLayer';
import AppOfflineBannerLayer from './AppOfflineBannerLayer';
import ImportJobBanner from './ImportJobBanner';
import AppModalLayer, { type AppModalLayerProps } from './AppModalLayer';
import AppSettingsModalLayer from './AppSettingsModalLayer';

/** Props de la capa de modales + las capas de estado/ajustes que la acompañan. */
export type AppOverlayLayersProps = AppModalLayerProps & {
  isLoading: boolean;
  loadingMessage: string;
  showOfflineBanner: boolean;
  showSettings: boolean;
  onCloseSettings: () => void;
  onOpenAiSettings: () => void;
  exportFormats: ExportFormat[];
  onExportFormatsChange: (formats: ExportFormat[]) => void;
};

const AppOverlayLayers: React.FC<AppOverlayLayersProps> = props => {
  const {
    isLoading,
    loadingMessage,
    showOfflineBanner,
    showSettings,
    onCloseSettings,
    onOpenAiSettings,
    exportFormats,
    onExportFormatsChange,
    ...modal
  } = props;

  return (
    <>
      <AppAmbientLightsLayer />
      <AppLoadingLayer isLoading={isLoading} loadingMessage={loadingMessage} />
      <AppOfflineBannerLayer showOfflineBanner={showOfflineBanner} />
      <ImportJobBanner />
      <AppModalLayer {...modal} />
      <AppSettingsModalLayer
        showSettings={showSettings}
        onCloseSettings={onCloseSettings}
        onOpenAiSettings={onOpenAiSettings}
        exportFormats={exportFormats}
        onExportFormatsChange={onExportFormatsChange}
      />
    </>
  );
};

AppOverlayLayers.displayName = 'AppOverlayLayers';

export default AppOverlayLayers;
