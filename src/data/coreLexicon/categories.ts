/**
 * Categories — Categorías semánticas del Extended Core Lexicon.
 *
 * Basado en: Ogden's Basic English (850 palabras) +
 * Conlangers' Lexipedia (expandido a ~1,500 conceptos).
 *
 * Cada categoría tiene un `semanticField` que agrupa conceptos
 * relacionados para la asignación inteligente.
 */

import type { CoreLexiconCategory } from '../../types/coreLexicon';

export interface SemanticCategory {
  /** Nombre de la categoría */
  category: CoreLexiconCategory;
  /** Campo semántico descriptivo */
  semanticField: string;
  /** Descripción para la UI */
  description: string;
}

export const SEMANTIC_CATEGORIES: SemanticCategory[] = [
  {
    category: 'Naturaleza',
    semanticField: 'Elementos naturales',
    description: 'Sol, luna, agua, tierra, fuego, aire, lluvia',
  },
  {
    category: 'Elementos',
    semanticField: 'Sustancias y materiales',
    description: 'Madera, piedra, metal, agua, fuego, arena',
  },
  {
    category: 'Anatomía',
    semanticField: 'Partes del cuerpo',
    description: 'Cabeza, mano, ojo, corazón, pie, boca',
  },
  {
    category: 'Verbs of Motion',
    semanticField: 'Acciones de movimiento',
    description: 'Caminar, correr, saltar, nadar, volar, caer',
  },
  {
    category: 'Verbs of Perception',
    semanticField: 'Acciones de percepción',
    description: 'Ver, oír, tocar, oler, saborear, sentir',
  },
  {
    category: 'Verbs of Communication',
    semanticField: 'Acciones de comunicación',
    description: 'Hablar, escuchar, escribir, leer, preguntar, responder',
  },
  {
    category: 'Verbs of Thinking',
    semanticField: 'Acciones de pensamiento',
    description: 'Pensar, recordar, creer, saber, imaginar, deducir',
  },
  {
    category: 'Verbs of Emotion',
    semanticField: 'Acciones y estados emocionales',
    description: 'Amar, odiar, temer, desear, reír, llorar',
  },
  {
    category: 'Verbs of State',
    semanticField: 'Verbos de estado',
    description: 'Ser, estar, tener, parecer, permanecer',
  },
  {
    category: 'Adjetivos de Calidad',
    semanticField: 'Propiedades y cualidades',
    description: 'Grande, pequeño, rápido, lento, bonito, feo, fuerte',
  },
  {
    category: 'Cantidad y Número',
    semanticField: 'Cantidad y numeración',
    description: 'Uno, dos, muchos, poco, mucho, mitad',
  },
  {
    category: 'Tiempo',
    semanticField: 'Conceptos temporales',
    description: 'Ahora, ayer, mañana, noche, día, semana, año',
  },
  {
    category: 'Lugar y Dirección',
    semanticField: 'Espacio y ubicación',
    description: 'Arriba, abajo, adentro, afuera, cerca, lejos',
  },
  {
    category: 'Personas y Roles',
    semanticField: 'Seres humanos y roles sociales',
    description: 'Hombre, mujer, niño, padre, amigo, rey',
  },
  {
    category: 'Objetos Cotidianos',
    semanticField: 'Objetos del día a día',
    description: 'Casa, mesa, silla, libro, camino, puerta',
  },
];

/** Mapa rápido de categoría a descripción */
export const CATEGORY_MAP: Record<CoreLexiconCategory, string> = SEMANTIC_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.category]: c.description }),
  {} as Record<CoreLexiconCategory, string>
);
