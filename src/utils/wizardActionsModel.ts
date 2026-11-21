/**
 * wizardActionsModel — logica pura de los handlers del wizard de primer arranque.
 *
 * El hook `useFirstRunWizardActions` es solo un envoltorio con `useMemo`; toda la
 * decision vive aca para poder probarse sin React ni sin el dialogo de Tauri.
 *
 * Contrato preservado del `App.tsx` original:
 *  - "Configurar ahora" abre el `AiSettingsModal` existente y NO marca el wizard
 *    como completo (se completa cuando el modal se cierra).
 *  - El cierre del modal cierra el modal y, solo si el wizard sigue abierto en el
 *    paso `ai`, marca el onboarding como hecho.
 *  - "Mas tarde" y "Completar" delegan en el hook de estado del wizard.
 *  - Elegir carpeta abre el dialogo de Tauri y solo actualiza si hay seleccion.
 */

import type { WizardStep } from '../hooks/useFirstRunWizard';

/** Identificadores de modal que `App.tsx` mantiene en `activeModal`. */
export type AppModalId =
  | 'none'
  | 'about'
  | 'restore'
  | 'ai_assistant'
  | 'lexicon_tools'
  | 'lexicon_compare'
  | 'profile'
  | 'report'
  | 'functions'
  | 'hyphens'
  | 'inflection_generator'
  | 'create_lexicon'
  | 'ai_settings';

export interface WizardActionDeps {
  showWizard: boolean;
  step: WizardStep;
  setActiveModal: (modal: AppModalId) => void;
  completeWizard: () => void;
  skipWizard: () => void;
  updateDataFolder: (folder: string) => void;
  /** Abre el dialogo de carpeta y devuelve la ruta elegida (o `null`). */
  chooseDataFolder: () => Promise<string | null>;
}

export interface WizardActions {
  handleWizardConfigureAi: () => void;
  handleAiSettingsModalClose: () => void;
  handleWizardSkip: () => void;
  handleWizardComplete: () => void;
  handleChooseDataFolder: () => void;
}

export function buildWizardActions(deps: WizardActionDeps): WizardActions {
  const {
    showWizard,
    step,
    setActiveModal,
    completeWizard,
    skipWizard,
    updateDataFolder,
    chooseDataFolder,
  } = deps;

  const handleWizardConfigureAi = () => {
    // Abre el AiSettingsModal existente; el wizard NO se completa hasta que el
    // modal se cierra (W4).
    setActiveModal('ai_settings');
  };

  const handleAiSettingsModalClose = () => {
    // Primero cierra el modal; despues, si el wizard seguia en el paso `ai`,
    // marca el onboarding como hecho.
    setActiveModal('none');
    if (showWizard && step === 'ai') {
      completeWizard();
    }
  };

  const handleWizardSkip = () => {
    // I3: "Mas tarde" — se salta pero queda marcado como mostrado.
    skipWizard();
  };

  const handleWizardComplete = () => {
    // I5: marca el wizard como completo.
    completeWizard();
  };

  const handleChooseDataFolder = () => {
    // I4: dialogo de Tauri; solo persiste si el usuario eligio una carpeta.
    chooseDataFolder()
      .then((selected) => {
        if (selected) {
          updateDataFolder(selected);
        }
      })
      .catch((error: unknown) => {
        console.error('Error choosing data folder:', error);
      });
  };

  return {
    handleWizardConfigureAi,
    handleAiSettingsModalClose,
    handleWizardSkip,
    handleWizardComplete,
    handleChooseDataFolder,
  };
}
