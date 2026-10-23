/**
 * FirstRunWizard — Modal wizard shown on first run.
 *
 * Steps:
 *  I1: "¿Configurar la IA ahora?" → opens AiSettingsModal EXISTENTE via onOpenAiSettings
 *  I2: "Más tarde" → warning banner + continue to data folder step
 *  I3: Data folder selection with Tauri file dialog
 *  I4: Mark onboarding complete
 */

import React from 'react';
import XCircleIcon from './icons/XCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import SparkleIcon from './icons/SparkleIcon';
import { WizardStep } from '../hooks/useFirstRunWizard';

export interface FirstRunWizardProps {
  step: WizardStep;
  dataFolder: string | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onConfigureAi: () => void;
  onChooseDataFolder: () => void;
  onDataFolderChange: (folder: string) => void;
}

const FirstRunWizard: React.FC<FirstRunWizardProps> = ({
  step,
  dataFolder,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  onConfigureAi,
  onChooseDataFolder,
  onDataFolderChange,
}) => {
  const renderStep = () => {
    switch (step) {
      case 'ai':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-12 h-12 bg-accent/20 rounded-full mx-auto">
              <SparkleIcon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center">
              ¿Configurar la IA ahora?
            </h3>
            <p className="text-sm text-text-secondary text-center">
              La inteligencia artificial te ayuda a analizar gramáticas complejas, 
              generar palabras y completar entradas de forma automática.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onConfigureAi}
                className="px-4 py-2 bg-accent text-white font-semibold rounded-md hover:bg-accent-hover transition-colors"
              >
                Configurar ahora
              </button>
              <button
                onClick={onNext}
                className="px-4 py-2 bg-background border border-subtle rounded-md text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
              >
                Más tarde
              </button>
            </div>
          </div>
        );

      case 'data-folder':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-12 h-12 bg-accent/20 rounded-full mx-auto">
              <AlertTriangleIcon className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-text-primary text-center">
              Carpeta de datos del proyecto
            </h3>
            <p className="text-sm text-text-secondary text-center">
              Selecciona dónde se guardarán los datos de tu proyecto Loxar.
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={dataFolder || ''}
                onChange={e => onDataFolderChange(e.target.value)}
                placeholder="Ruta de la carpeta de datos"
                className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
              <button
                onClick={onChooseDataFolder}
                className="w-full px-4 py-2 bg-background border border-subtle rounded-md text-text-secondary hover:text-text-primary hover:border-accent transition-colors text-sm"
              >
                Cambiar ubicación
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success/20 rounded-full mx-auto">
              <CheckIcon className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">
              ¡Listo para comenzar!
            </h3>
            <p className="text-sm text-text-secondary">
              Tu configuración se ha guardado. Puedes cambiarla en cualquier momento 
              desde Ajustes.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background-dark/80 backdrop-blur-sm">
      <div className="bg-surface-dark border border-border-dark rounded-xl shadow-glow w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-accent" />
            Primeros pasos
          </h2>
          {step !== 'ai' && (
            <button
              onClick={onPrev}
              className="p-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Step content */}
        <div className="mb-6">{renderStep()}</div>

        {/* Warning for "Más tarde" path (I3) */}
        {step === 'data-folder' && (
          <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-md flex items-start gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              Sin IA configurada, algunas funciones de análisis profundo podrían ser poco precisas.
              Puedes configurar la IA más tarde desde Ajustes.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-border-dark">
          <button
            onClick={onSkip}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Saltar por ahora
          </button>
          {step === 'data-folder' && (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-accent text-white font-semibold rounded-md hover:bg-accent-hover transition-colors"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple check icon for the "complete" step
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

FirstRunWizard.displayName = 'FirstRunWizard';

export default FirstRunWizard;
