/**
 * AppBodyLayer.tsx
 * ────────────────
 * Cuerpo principal del `return` de `App.tsx`, extraído del God Component
 * (P1). Agrupa la barra lateral (`VerticalSidebar`), la barra de navegación
 * superior (`AppNavigationBar`, solo fuera del dashboard) y el `AppTabContent`
 * con el switch de tabs.
 *
 * Contratos preservados del `App.tsx` original:
 *  - el orden de render no cambia: `VerticalSidebar` → `main` →
 *    `AppNavigationBar` (condicional) → `AppTabContent`;
 *  - `AppNavigationBar` se monta solo cuando `activeTab !== 'dashboard'`;
 *  - la barra lateral recibe `onStartTour` como `onShowTour` (mismo handler que
 *    ya propagaba `AppTabContent`);
 *  - `AppTabContent` recibe el `AppTabContentProps` completo, sin agrupar las
 *    props por tab (medido: el agrupamiento aumentaba el call site).
 */
import React from 'react';
import type { AppTabId } from '../utils/appTabs';
import type { QuickNavTarget } from '../utils/tabNavigationModel';
import VerticalSidebar from './VerticalSidebar';
import AppNavigationBar from './AppNavigationBar';
import AppTabContent, { type AppTabContentProps } from './AppTabContent';

/** Props del cuerpo: el contrato de `AppTabContent` + la barra lateral/nav. */
export type AppBodyLayerProps = AppTabContentProps & {
  /** Cambio de tab desde la barra lateral. */
  onSidebarTabChange: (id: AppTabId) => void;
  onOpenWidget: () => void;
  onOpenSettings: () => void;
  onGoHome: () => void;
  onNavBack: () => void;
  onQuickNav: (target: QuickNavTarget) => void;
};

const AppBodyLayer: React.FC<AppBodyLayerProps> = props => {
  const {
    onSidebarTabChange,
    onOpenWidget,
    onOpenSettings,
    onGoHome,
    onNavBack,
    onQuickNav,
    ...content
  } = props;

  return (
    <div className="flex flex-1 min-h-0 relative">
      <VerticalSidebar
        active={content.activeTab}
        onChange={onSidebarTabChange}
        onOpenWidget={onOpenWidget}
        onOpenSettings={onOpenSettings}
        onShowTour={content.onStartTour}
        onGoHome={onGoHome}
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-0 custom-scrollbar scroll-smooth bg-surface-dark/40 backdrop-blur-sm">
        {content.activeTab !== 'dashboard' && (
          <AppNavigationBar
            onBack={onNavBack}
            onHome={onGoHome}
            activeTab={content.activeTab}
            onQuickNav={onQuickNav}
          />
        )}
        <AppTabContent {...content} />
      </main>
    </div>
  );
};

AppBodyLayer.displayName = 'AppBodyLayer';

export default AppBodyLayer;
