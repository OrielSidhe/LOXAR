/**
 * AppWelcomeLayer.tsx
 * ──────────────────
 * Bloque de bienvenida del `return` de `App.tsx`, extraído del God Component
 * (P1).
 *
 * `App.tsx` montaba inline el `AppWelcomeSection` (splash + pantalla de
 * bienvenida + tour) y el `FirstRunWizard` del primer arranque, ~35 líneas con
 * ~20 props. Este componente concentra ese bloque con props tipadas
 * estrictamente y el mismo orden de render.
 *
 * Contratos preservados del `App.tsx` original:
 *  - el wizard se monta solo cuando `showWizard` es verdadero;
 *  - el botón "Siguiente" del wizard completa el asistente solo en el paso
 *    `data-folder` (decisión en `welcomeLayerModel`, antes inline en `App.tsx`);
 *  - los efectos secundarios de la bienvenida (jingle y cierre de la pantalla)
 *    siguen siendo de `App.tsx`, que los inyecta como `onImport`/`onStartTour`.
 */
import React from 'react';
import type { TourStep } from '../data/tourSteps';
import type { WizardStep } from '../hooks/useFirstRunWizard';
import { shouldCompleteWizardStep } from '../utils/welcomeLayerModel';
import AppWelcomeSection from './AppWelcomeSection';
import FirstRunWizard from './FirstRunWizard';

export type AppWelcomeLayerProps = {
  splashFinished: boolean;
  onSplashFinish: () => void;
  showWelcome: boolean;
  showWizard: boolean;
  onCreateLexicon: () => void;
  onContinue: () => void;
  onImport: (content: string) => void;
  onStartTour: () => void;
  isTourActive: boolean;
  tourSteps: TourStep[];
  onTourEnd: () => void;
  step: WizardStep;
  dataFolder: string | null;
  onWizardNext: () => void;
  onWizardPrev: () => void;
  onWizardSkip: () => void;
  onWizardComplete: () => void;
  onConfigureAi: () => void;
  onChooseDataFolder: () => void;
  onDataFolderChange: (folder: string) => void;
};

const AppWelcomeLayer: React.FC<AppWelcomeLayerProps> = ({
  splashFinished,
  onSplashFinish,
  showWelcome,
  showWizard,
  onCreateLexicon,
  onContinue,
  onImport,
  onStartTour,
  isTourActive,
  tourSteps,
  onTourEnd,
  step,
  dataFolder,
  onWizardNext,
  onWizardPrev,
  onWizardSkip,
  onWizardComplete,
  onConfigureAi,
  onChooseDataFolder,
  onDataFolderChange,
}) => {
  return (
    <>
      <AppWelcomeSection
        splashFinished={splashFinished}
        onSplashFinish={onSplashFinish}
        showWelcome={showWelcome}
        onCreateLexicon={onCreateLexicon}
        onContinue={onContinue}
        onImport={onImport}
        onStartTour={onStartTour}
        isTourActive={isTourActive}
        tourSteps={tourSteps}
        onTourEnd={onTourEnd}
      />

      {/* I1-I5: First-run wizard */}
      {showWizard && (
        <FirstRunWizard
          step={step}
          dataFolder={dataFolder}
          onNext={onWizardNext}
          onPrev={onWizardPrev}
          onSkip={onWizardSkip}
          onComplete={shouldCompleteWizardStep(step) ? onWizardComplete : onWizardNext}
          onConfigureAi={onConfigureAi}
          onChooseDataFolder={onChooseDataFolder}
          onDataFolderChange={onDataFolderChange}
        />
      )}
    </>
  );
};

AppWelcomeLayer.displayName = 'AppWelcomeLayer';

export default AppWelcomeLayer;
