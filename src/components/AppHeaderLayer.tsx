/**
 * AppHeaderLayer.tsx
 * ──────────────────
 * Cabecera del `return` de `App.tsx`, extraída del God Component (P1).
 * Agrupa el `Header` (marca, widget, ajustes y tema) y el `AppToolbar`
 * (selector de léxico, acciones de archivo, proyecto y sesión).
 *
 * Contratos preservados del `App.tsx` original:
 *  - el orden de render no cambia: `Header` → `AppToolbar`;
 *  - no hay solapamiento de nombres entre `HeaderProps` y `AppToolbarProps`,
 *    por lo que el destructure es exhaustivo y el resto se propaga íntegro
 *    al toolbar;
 *  - `onShowTour`/`onOpenSettings` conservan su carácter opcional en `Header`.
 */
import React from 'react';
import Header, { type HeaderProps } from './Header';
import AppToolbar, { type AppToolbarProps } from './AppToolbar';

/** Props de la cabecera: el contrato de `Header` + el de `AppToolbar`. */
export type AppHeaderLayerProps = HeaderProps & AppToolbarProps;

const AppHeaderLayer: React.FC<AppHeaderLayerProps> = props => {
  const {
    wordsAddedCount,
    onOpenWidget,
    onShowTour,
    onOpenSettings,
    themeId,
    onThemeChange,
    ...toolbar
  } = props;

  return (
    <>
      <Header
        wordsAddedCount={wordsAddedCount}
        onOpenWidget={onOpenWidget}
        onShowTour={onShowTour}
        onOpenSettings={onOpenSettings}
        themeId={themeId}
        onThemeChange={onThemeChange}
      />
      <AppToolbar {...toolbar} />
    </>
  );
};

AppHeaderLayer.displayName = 'AppHeaderLayer';

export default AppHeaderLayer;
