/**
 * useFirstRunWizard — React hook for managing the first-run onboarding flow.
 *
 * Responsibilities:
 *  - Detect first execution via the persisted flag "loxar_onboarding_v1_done"
 *  - Provide the wizard step state and navigation
 *  - Persist the "completed" flag at the end so the wizard never reappears
 *  - Manage the data folder selection step
 */

import { useState, useEffect, useCallback } from 'react';
import {
  hasCompletedOnboarding,
  setOnboardingCompleted,
  getDataFolder,
  setDataFolder,
} from '../services/onboarding';

export type WizardStep = 'ai' | 'data-folder' | 'complete';

export interface UseFirstRunWizardResult {
  showWizard: boolean;
  step: WizardStep;
  dataFolder: string | null;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipWizard: () => void;
  completeWizard: () => void;
  updateDataFolder: (folder: string) => void;
  setHasShownWizard: (val: boolean) => void;
}

/** Check if this is the first run — no onboarding flag set. */
export function checkIsFirstRun(): boolean {
  return !hasCompletedOnboarding();
}

const STEP_ORDER: WizardStep[] = ['ai', 'data-folder', 'complete'];

export function useFirstRunWizard(): UseFirstRunWizardResult {
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<WizardStep>('ai');
  const [dataFolder, setDataFolderState] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // On mount, determine if this is a first run
  useEffect(() => {
    const firstRun = checkIsFirstRun();
    if (firstRun) {
      setShowWizard(true);
      // Pre-load any existing data folder
      const folder = getDataFolder();
      if (folder) setDataFolderState(folder);
    }
    setHasChecked(true);
  }, []);

  const goToStep = useCallback((newStep: WizardStep) => {
    setStep(newStep);
  }, []);

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIndex]);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(step);
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEP_ORDER[prevIndex]);
    }
  }, [step]);

  const skipWizard = useCallback(() => {
    setShowWizard(false);
    setOnboardingCompleted();
  }, []);

  const completeWizard = useCallback(() => {
    setShowWizard(false);
    setOnboardingCompleted();
  }, []);

  const updateDataFolder = useCallback((folder: string) => {
    setDataFolderState(folder);
    setDataFolder(folder);
  }, []);

  const setHasShownWizard = useCallback((val: boolean) => {
    setShowWizard(val);
    if (val === false) {
      setOnboardingCompleted();
    }
  }, []);

  return {
    showWizard: hasChecked && showWizard,
    step,
    dataFolder,
    goToStep,
    nextStep,
    prevStep,
    skipWizard,
    completeWizard,
    updateDataFolder,
    setHasShownWizard,
  };
}
