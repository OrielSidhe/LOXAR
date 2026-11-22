/**
 * tourStepsModel.test.ts — seleccion de la lista de pasos del tour.
 *
 * `useAppHandlers.handleStartTour` resolvía inline qué lista cargar según el
 * tab activo; la decision es pura y debe ser total sobre `AppTabId`.
 */
import { describe, it, expect } from 'vitest';
import { resolveTourSteps } from '../tourStepsModel';
import { APP_TAB_IDS } from '../appTabs';
import {
  MAIN_TOUR_STEPS,
  COLLECTIONS_TOUR_STEPS,
  WRITING_TOUR_STEPS,
  TOOLS_TOUR_STEPS,
} from '../../data/tourSteps';

describe('resolveTourSteps', () => {
  it('devuelve la lista principal por defecto', () => {
    expect(resolveTourSteps('dashboard')).toBe(MAIN_TOUR_STEPS);
    expect(resolveTourSteps('table')).toBe(MAIN_TOUR_STEPS);
    expect(resolveTourSteps('workbench')).toBe(MAIN_TOUR_STEPS);
    expect(resolveTourSteps('grammar')).toBe(MAIN_TOUR_STEPS);
    expect(resolveTourSteps('translator')).toBe(MAIN_TOUR_STEPS);
  });

  it('devuelve la lista especifica en collections/writing/tools', () => {
    expect(resolveTourSteps('collections')).toBe(COLLECTIONS_TOUR_STEPS);
    expect(resolveTourSteps('writing')).toBe(WRITING_TOUR_STEPS);
    expect(resolveTourSteps('tools')).toBe(TOOLS_TOUR_STEPS);
  });

  it('es total sobre los 8 tabs (sin excepciones)', () => {
    for (const tab of APP_TAB_IDS) {
      expect(Array.isArray(resolveTourSteps(tab)), tab).toBe(true);
    }
  });

  it('las listas devueltas tienen la forma de TourStep', () => {
    for (const tab of APP_TAB_IDS) {
      for (const step of resolveTourSteps(tab)) {
        expect(typeof step.selector).toBe('string');
        expect(typeof step.title).toBe('string');
        expect(typeof step.content).toBe('string');
      }
    }
  });
});
