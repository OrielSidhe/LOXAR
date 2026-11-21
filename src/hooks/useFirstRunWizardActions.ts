/**
 * useFirstRunWizardActions — handlers del wizard de primer arranque de `App.tsx`.
 *
 * Toda la logica vive en `buildWizardActions` (`src/utils/wizardActionsModel.ts`);
 * este hook solo la memoiza y cablea el dialogo real de carpetas de Tauri.
 */

import { useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import {
  buildWizardActions,
  type AppModalId,
  type WizardActions,
} from '../utils/wizardActionsModel';
import type { WizardStep } from './useFirstRunWizard';

export interface UseFirstRunWizardActionsOptions {
  showWizard: boolean;
  step: WizardStep;
  completeWizard: () => void;
  skipWizard: () => void;
  updateDataFolder: (folder: string) => void;
  openModal: (modal: AppModalId) => void;
}

const DATA_FOLDER_DIALOG_OPTIONS = {
  multiple: false,
  directory: true,
  title: 'Seleccionar carpeta de datos del proyecto',
} as const;

export function useFirstRunWizardActions(
  options: UseFirstRunWizardActionsOptions,
): WizardActions {
  const {
    showWizard,
    step,
    completeWizard,
    skipWizard,
    updateDataFolder,
    openModal,
  } = options;

  return useMemo<WizardActions>(
    () =>
      buildWizardActions({
        showWizard,
        step,
        completeWizard,
        skipWizard,
        updateDataFolder,
        openModal,
        chooseDataFolder: async () => {
          const selected = await open({ ...DATA_FOLDER_DIALOG_OPTIONS });
          return typeof selected === 'string' ? selected : null;
        },
      }),
    [
      showWizard,
      step,
      completeWizard,
      skipWizard,
      updateDataFolder,
      openModal,
    ],
  );
}
