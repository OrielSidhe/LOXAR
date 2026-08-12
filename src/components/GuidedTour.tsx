// FIX: Imported React to resolve namespace errors for React.CSSProperties.
import React, { useState, useLayoutEffect } from 'react';
import XCircleIcon from './icons/XCircleIcon';

interface TourStep {
  selector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  onClose: () => void;
}

const GuidedTour = ({ steps, onClose }: GuidedTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = steps[stepIndex];

  useLayoutEffect(() => {
    const element = document.querySelector(currentStep.selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // A short delay to allow for scrolling animation before getting the rect
      const timeoutId = setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [stepIndex, currentStep.selector]);

  const handleNext = () => {
    setTargetRect(null);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setTargetRect(null);
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  if (!targetRect) {
    return (
        // Render a transparent overlay while scrolling to prevent user interaction
        <div className="fixed inset-0 z-[9998] bg-transparent" />
    );
  }

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.bottom + 10,
    left: targetRect.left,
    transform: 'translateX(0)',
    maxWidth: '300px',
    zIndex: 10001,
  };
  
  // Adjust position if it goes off-screen
    if (targetRect.bottom + 200 > window.innerHeight) { // Approximate tooltip height
        tooltipStyle.top = targetRect.top - 10;
        tooltipStyle.transform = 'translateY(-100%)';
    }
    if (targetRect.left + 300 > window.innerWidth) {
        tooltipStyle.left = targetRect.right;
        tooltipStyle.transform = 'translateX(-100%)';
    }
     if (targetRect.left < 0) {
        tooltipStyle.left = 10;
    }


  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.top - 4,
    left: targetRect.left - 4,
    width: targetRect.width + 8,
    height: targetRect.height + 8,
    boxShadow: '0 0 0 9999px rgba(12, 28, 24, 0.7)',
    borderRadius: '6px',
    zIndex: 9999,
    pointerEvents: 'none',
    transition: 'all 0.3s ease-in-out',
  };

  return (
    <div className="fixed inset-0 z-[9998]" aria-live="polite">
      <div style={highlightStyle} />
      <div style={tooltipStyle} className="bg-surface p-4 rounded-lg shadow-2xl border border-accent animate-fade-in-fast">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-accent">{currentStep.title}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-white"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        <p className="text-text-primary text-sm mb-4">{currentStep.content}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-secondary">{stepIndex + 1} / {steps.length}</span>
          <div>
            {stepIndex > 0 && <button onClick={handlePrev} className="px-3 py-1 text-sm bg-subtle rounded-md hover:bg-gray-600 mr-2">Anterior</button>}
            <button onClick={handleNext} className="px-4 py-1 text-sm bg-accent text-white rounded-md hover:bg-accent-hover">
              {stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;