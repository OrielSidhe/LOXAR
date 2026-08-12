/**
 * schemaMigrations.ts
 * ----------------------------------------------------------------------------
 * Pipeline de migraciones para LexiconData.
 *
 * Flujo recomendado:
 *   1. Cargar JSON desde SQLite / localStorage.
 *   2. Pasar por `applyMigrations`.
 *   3. Guardar el resultado con `saveLexicon`.
 * ----------------------------------------------------------------------------
 */

import type { LexiconData } from '../types';

/** Versión actual del esquema. Subirla cada vez que agregues una migración. */
export const CURRENT_SCHEMA_VERSION = 1;

export type Migration = {
  fromVersion: number;
  toVersion: number;
  migrate: (data: LexiconData) => LexiconData;
};

const migrations: Migration[] = [];

/**
 * Aplica todas las migraciones necesarias para llevar `data`
 * desde su schemaVersion actual hacia `CURRENT_SCHEMA_VERSION`.
 *
 * Nunca muta el objeto original.
 */
export function applyMigrations(data: LexiconData): LexiconData {
  const currentVersion = typeof data.schemaVersion === 'number'
    ? data.schemaVersion
    : 0;

  if (currentVersion === CURRENT_SCHEMA_VERSION) {
    return data;
  }

  if (currentVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Lexicon schemaVersion ${currentVersion} is newer than supported ${CURRENT_SCHEMA_VERSION}.`
    );
  }

  let migrated = structuredClone(data);

  for (const migration of migrations) {
    if (migrated.schemaVersion === migration.fromVersion) {
      migrated = migration.migrate(migrated);
      migrated.schemaVersion = migration.toVersion;
    }
  }

  // Si quedó desincronizado, forzar la versión final para evitar loops.
  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
  return migrated;
}

/**
 * Inicializa un LexiconData vacío con la versión actual de esquema.
 */
export function createEmptyLexiconData(overrides?: Partial<LexiconData>): LexiconData {
  return {
    entries: [],
    profile: {
      consonants: [],
      vowels: [],
      syllableStructures: [],
      consonantClusters: [],
      vowelClusters: [],
      sampleText: '',
      grammarNotes: '',
      derivationalAffixes: [],
    },
    neography: {
      glyphs: [],
      characterMap: {},
      ligatures: {},
    },
    inflection: {
      paradigms: [],
      phonologicalRules: [],
    },
    grammar: {
      meta: { author: 'Unknown', version: '1.0', sourceFormat: 'json', lastUpdated: new Date().toISOString() },
      typology: { wordOrder: 'SOV', alignment: 'Nominative-Accusative', morphology: 'Isolating', headDirection: 'Head-Initial' },
      strategies: [],
      roles: [],
      notes: [],
      paradigms: [],
      mutationRules: [],
      exceptions: [],
      affixInventory: [],
      preview: { useLexiconAffixes: false },
    },
    corpus: [],
    metadata: {
      conlangName: '',
      mainLanguage: '',
    },
    wordsAddedSinceSave: 0,
    customFunctions: [],
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...overrides,
  };
}
