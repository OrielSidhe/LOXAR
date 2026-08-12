/**
 * Grammar guided tour component for ZCode.
 * Provides step‑by‑step onboarding for the universal grammar engine UI.
 * Follows the project's existing patterns (React hooks, Tailwind, TypeScript).
 */
import { useEffect, useState, useCallback } from 'react';
import CheckIcon from '../components/icons/CheckCircleIcon';
import XCircleIcon from '../components/icons/XCircleIcon';
import ArrowRightIcon from '../components/icons/ArrowRightIcon';
import SparkleIcon from '../components/icons/SparkleIcon';
import type { GrammarManifest } from '../types';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlight target
  action?: () => void; // Optional action to perform on this step
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'overview',
    title: 'Bienvenido a la Gramática Universal',
    description:
      'Esta vista muestra cómo tu idioma marca las relaciones entre palabras (sujeto, verbo, objeto, etc.). ' +
      'El motor interno usa conceptos universales (agente, paciente, caso, orden…); la interfaz te muestra ' +
      'términos familiares (sujeto, objeto, caso, tiempo).',
    target: '#grammar-overview',
  },
  {
    id: 'roles-strategies',
    title: 'Roles y Estrategias de Realización',
    description:
      'Cada rol semántico (agente, paciente, receptor…) puede realizarse mediante caso, preposición, ' +
      'orden de palabras, partícula, tono, concordancia o mutación. Haz clic en un rol para cambiar su estrategia.',
    target: '#roles-section',
  },
  {
    id: 'mutations',
    title: 'Mutaciones y Sandhi',
    description:
      'Define reglas de cambio de sonido condicionadas por contexto: vocal de enlace condicional, ' +
      'elisión de vocal final, armonía vocálica, etc. Estas reglas se aplican antes de generar la forma final.',
    target: '#mutations-section',
  },
  {
    id: 'paradigms',
    title: 'Paradigmas de Flexión',
    description:
      'Define cómo varían tiempo, persona, número, caso, género, aspecto… Cada ranura (slot) tiene ' +
      'su orden y una realización (afijo, mutación, partícula, tono, etc.). El motor aplica las ranuras en orden.',
    target: '#paradigms-section',
  },
  {
    id: 'canvas-test',
    title: 'Prueba en el Canvas Sintáctico',
    description:
      'Ve a la pestaña "Canvas" y usa el botón 🔍 en cualquier nodo de palabra. Cambia rasgos ' +
      '(tiempo, persona, número) y verás la forma de superficie actualizarse en tiempo real.',
    target: '#syntax-canvas-tab',
  },
];

const TOUR_STORAGE_KEY = 'zcode:grammar-tour-seen';

export function GrammarGuidedTour({
  isOpen,
  onClose,
  onStepComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStepComplete?: (stepId: string) => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Reset tour when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setShowConfetti(false);
    }
  }, [isOpen]);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (onStepComplete) {
      onStepComplete(currentStep.id);
    }

    if (isLastStep) {
      setShowConfetti(true);
      setTimeout(() => {
        // Mark tour as seen in sessionStorage
        try {
          sessionStorage.setItem(TOUR_STORAGE_KEY, 'true');
        } catch {
          // Ignore storage errors
        }
        onClose();
      }, 800);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStep.id, isLastStep, onClose, onStepComplete]);

  const handleSkip = useCallback(() => {
    try {
      sessionStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    onClose();
  }, [onClose]);

  const handlePrevious = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay with highlight target */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Tour modal */}
      <div
        className="fixed bottom-4 right-4 z-50 w-full max-w-md animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        <div className="bg-surface rounded-xl shadow-2xl border border-subtle overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-subtle bg-surface/95 backdrop-blur">
            <div className="flex items-center gap-3">
              <SparkleIcon className="h-6 w-6 text-accent" />
              <div>
                <h3 id="tour-title" className="text-lg font-bold text-text-primary">
                  {currentStep.title}
                </h3>
                <p className="text-xs text-text-secondary">
                  Paso {currentStepIndex + 1} de {TOUR_STEPS.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 rounded-full text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
              aria-label="Saltar recorrido"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-text-primary text-sm leading-relaxed">
              {currentStep.description}
            </p>

            {/* Progress indicator */}
            <div className="mt-4 flex items-center gap-2">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    index < currentStepIndex
                      ? 'bg-success'
                      : index === currentStepIndex
                      ? 'bg-accent'
                      : 'bg-subtle'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-subtle bg-surface/95 backdrop-blur">
            <button
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRightIcon className="h-4 w-4 transform rotate-180" />
              Anterior
            </button>

            <div className="flex gap-3">
              {!isLastStep && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Saltar
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-semibold rounded-lg shadow-lg hover:bg-accent-hover transition-all"
              >
                {isLastStep ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Finalizar
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Confetti celebration */}
        {showConfetti && (
          <div
            className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiPiece key={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Simple confetti piece component for tour completion celebration.
 * Uses CSS animations for lightweight visual feedback.
 */
function ConfettiPiece() {
  const left = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random() * 1;
  const colors = ['#e11d48', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 6 + Math.random() * 8;

  return (
    <div
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
      } as React.CSSProperties}
      className="absolute top-0 animate-confetti"
    />
  );
}

/**
 * Hook to check if the grammar tour has been seen in this session.
 * Returns true if the tour should be shown (i.e., not yet seen).
 */
export function useGrammarTourVisibility(): boolean {
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(TOUR_STORAGE_KEY);
      setShouldShow(!seen);
    } catch {
      // If storage access fails, show tour by default
      setShouldShow(true);
    }
  }, []);

  return shouldShow;
}

/**
 * Hook to mark the grammar tour as completed.
 * Useful for manual tour completion triggers.
 */
export function useMarkGrammarTourComplete() {
  return useCallback(() => {
    try {
      sessionStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);
}