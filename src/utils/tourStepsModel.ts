/**
 * tourStepsModel — seleccion pura de los pasos del tour segun el tab activo.
 *
 * `useAppHandlers.handleStartTour` resolvía inline que lista de pasos cargar
 * segun `activeTab`. La decision es pura (mismo input → misma lista) y no
 * depende de React, asi que vive aca para poder testearla sin montar el hook.
 */
import type { AppTabId } from './appTabs';
import {
  MAIN_TOUR_STEPS,
  COLLECTIONS_TOUR_STEPS,
  WRITING_TOUR_STEPS,
  TOOLS_TOUR_STEPS,
  type TourStep,
} from '../data/tourSteps';

export function resolveTourSteps(activeTab: AppTabId): TourStep[] {
  if (activeTab === 'collections') return COLLECTIONS_TOUR_STEPS;
  if (activeTab === 'writing') return WRITING_TOUR_STEPS;
  if (activeTab === 'tools') return TOOLS_TOUR_STEPS;
  return MAIN_TOUR_STEPS;
}
