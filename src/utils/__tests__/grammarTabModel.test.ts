import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GRAMMAR_MODULE,
  DEFAULT_SYNTAX_SUB_TAB,
  buildClauseParticipants,
  buildClausePreview,
  buildLexiconAffixes,
  calculateGrammarProgress,
  createAffix,
  createStrategy,
  createSyntacticRole,
  isFirstRunManifest,
  mergeFlexibleGrammar,
  mergePreviewConfig,
  withLastUpdated,
  withLexiconAffixes,
} from '../grammarTabModel';
import type { GrammarModule, GrammarPreview, SyntaxSubTab } from '../grammarTabModel';
import { getDefaultGrammarManifest } from '../../services/normalize';
import type { FlexibleGrammar } from '../../types/grammar-flexible';
import type { GrammarManifest, LexiconEntry } from '../../types';

const FIXED_LAST_UPDATED = '2020-01-01T00:00:00.000Z';

const manifestWithFixedDate = (): GrammarManifest => {
  const manifest = getDefaultGrammarManifest();
  return { ...manifest, meta: { ...manifest.meta, lastUpdated: FIXED_LAST_UPDATED } };
};

const lexicon: LexiconEntry[] = [
  { ID: '1', Raíz: 'kal', Léxema: ['kala'], Categoría: 'sustantivo', Significado: ['perro'], extraData: {} },
  { ID: '2', Raíz: 'tin', Léxema: ['tini'], Categoría: 'verbo', Significado: ['correr'], extraData: {} },
  { ID: '3', Raíz: 'sor', Léxema: ['soro'], Categoría: 'sustantivo', Significado: ['sol'], extraData: {} },
  { ID: '4', Raíz: 'ka', Léxema: ['-ka'], Categoría: 'sufijo', Significado: ['plural'], extraData: {} },
  { ID: '5', Raíz: 'pri', Léxema: ['pri-'], Categoría: 'prefijo', Significado: ['anterior'], extraData: {} },
  { ID: '6', Raíz: 'mi', Léxema: ['-mi-'], Categoría: 'infijo', Significado: ['intensivo'], extraData: {} },
];

const flexible = (overrides: Partial<FlexibleGrammar> = {}): FlexibleGrammar => ({
  id: 'g1',
  name: 'Gramática de prueba',
  storageMode: 'structured',
  rawText: '# Gramática\n\nOrden: SVO',
  structured: {
    manifest: getDefaultGrammarManifest(),
    confidence: 0.9,
    uninterpretedSections: [],
  },
  computationalRules: { inflection: [], wordOrder: [] },
  lastModified: 1,
  ...overrides,
});

describe('grammarTabModel: constantes y tipos', () => {
  it('expone el módulo y sub-pestaña por defecto', () => {
    expect(DEFAULT_GRAMMAR_MODULE).toBe<GrammarModule>('syntax');
    expect(DEFAULT_SYNTAX_SUB_TAB).toBe<SyntaxSubTab>('canvas');
  });
});

describe('isFirstRunManifest', () => {
  it('es primer arranque con el manifiesto por defecto', () => {
    expect(isFirstRunManifest(getDefaultGrammarManifest())).toBe(true);
  });

  it('no es primer arranque si hay paradigmas, fonología o tipología significativa', () => {
    const withParadigms: GrammarManifest = { ...getDefaultGrammarManifest(), paradigms: [{ id: 'p1' } as never] };
    expect(isFirstRunManifest(withParadigms)).toBe(false);

    const withPhonology: GrammarManifest = { ...getDefaultGrammarManifest(), phonology: { inventory: [] } as never };
    expect(isFirstRunManifest(withPhonology)).toBe(false);

    const withTypology: GrammarManifest = {
      ...getDefaultGrammarManifest(),
      typology: { ...getDefaultGrammarManifest().typology, wordOrder: 'OVS' },
    };
    expect(isFirstRunManifest(withTypology)).toBe(false);
  });
});

describe('calculateGrammarProgress', () => {
  it('deriva métricas del manifiesto y el promedio global', () => {
    const manifest: GrammarManifest = {
      ...getDefaultGrammarManifest(),
      phonology: { inventory: [] } as never,
      typology: { wordOrder: 'OVS', alignment: 'Nominative-Accusative', morphology: 'Isolating', headDirection: 'Head-Initial' },
      roles: [{ id: 'r1', name: 'Sujeto' }, { id: 'r2', name: 'Objeto' }],
      strategies: [{ id: 's1', name: 'Posición', type: 'position', appliesTo: [] }],
    };

    const { metrics, overallProgress } = calculateGrammarProgress(manifest);

    expect(metrics).toHaveLength(4);
    expect(metrics[0]).toMatchObject({ category: 'Fonología', completed: 1, total: 1 });
    // La métrica de tipología cuenta campos definidos (los 4 presentes), no desvíos del default.
    expect(metrics[1]).toMatchObject({ category: 'Tipología', completed: 4, total: 4 });
    expect(metrics[2]).toMatchObject({ category: 'Roles Sintácticos', completed: 2, total: 5 });
    expect(metrics[3]).toMatchObject({ category: 'Estrategias', completed: 1, total: 3 });

    const totalCompleted = 1 + 4 + 2 + 1;
    const totalItems = 1 + 4 + 5 + 3;
    expect(overallProgress).toBe(Math.round((totalCompleted / totalItems) * 100));
  });

  it('reporta 0% cuando ninguna categoría tiene contenido', () => {
    const empty: GrammarManifest = {
      ...getDefaultGrammarManifest(),
      typology: { wordOrder: '', alignment: '', morphology: '', headDirection: '' },
    };
    const { overallProgress, metrics } = calculateGrammarProgress(empty);
    expect(overallProgress).toBe(0);
    expect(metrics.map(m => m.completed)).toEqual([0, 0, 0, 0]);
  });
});

describe('factories', () => {
  it('crean rol, estrategia y afijo con valores por defecto y ids únicos', () => {
    const role = createSyntacticRole();
    expect(role).toMatchObject({ name: 'Nuevo Rol' });
    expect(role.id).toMatch(/^role_/);

    const strategy = createStrategy();
    expect(strategy).toMatchObject({ name: 'Nueva Estrategia', type: 'position', appliesTo: [] });
    expect(strategy.id).toMatch(/^strat_/);

    const affix = createAffix();
    expect(affix).toMatchObject({ form: '-', type: 'suffix', source: 'manual', enabled: true });
    expect(affix.id).toMatch(/^affix_/);
  });
});

describe('buildLexiconAffixes', () => {
  it('deriva afijos del léxico respetando tipo y habilitación', () => {
    const affixes = buildLexiconAffixes(lexicon, true);
    expect(affixes).toHaveLength(3);

    expect(affixes.find(a => a.id === 'lexicon_4')).toMatchObject({ form: '-ka', type: 'suffix', source: 'lexicon', enabled: true });
    expect(affixes.find(a => a.id === 'lexicon_5')).toMatchObject({ type: 'prefix' });
    expect(affixes.find(a => a.id === 'lexicon_6')).toMatchObject({ type: 'infix' });
  });

  it('deshabilita los afijos cuando el preview no los usa y excluye entradas sin forma', () => {
    const disabled = buildLexiconAffixes(lexicon, false);
    expect(disabled.every(a => a.enabled === false)).toBe(true);

    const noForm: LexiconEntry = { ID: '9', Raíz: '', Léxema: [], Categoría: 'sufijo', Significado: [], extraData: {} };
    expect(buildLexiconAffixes([noForm], true)).toHaveLength(0);
  });
});

describe('withLexiconAffixes', () => {
  it('concatena el inventario manual con los afijos del léxico sin mutar el original', () => {
    const manifest = getDefaultGrammarManifest();
    const next = withLexiconAffixes(manifest, buildLexiconAffixes(lexicon, true));

    expect(next.affixInventory).toHaveLength(3);
    expect(manifest.affixInventory).toHaveLength(0);
    expect(next.meta).toBe(manifest.meta);
  });
});

describe('buildClauseParticipants', () => {
  it('arma S/V/O y descarta participantes sin lexema', () => {
    const entries = { subject: lexicon[0], verb: lexicon[1], object: undefined };
    const participants = buildClauseParticipants(entries);

    expect(participants.map(p => p.role)).toEqual(['subject', 'verb']);
    expect(participants.every(p => p.features && typeof p.features === 'object')).toBe(true);
  });
});

describe('buildClausePreview', () => {
  it('realiza la cláusula con el motor real usando las entradas del preview', () => {
    const manifest: GrammarManifest = {
      ...getDefaultGrammarManifest(),
      preview: { useLexiconAffixes: false, subjectEntryId: '1', verbEntryId: '2', objectEntryId: '3' },
    };
    const preview: GrammarPreview = buildClausePreview(lexicon, manifest);

    expect(preview.gloss).toBe('SVO');
    expect(preview.sentence.length).toBeGreaterThan(0);
    expect(preview.entries.subject?.ID).toBe('1');
    expect(preview.entries.verb?.ID).toBe('2');
    expect(preview.entries.object?.ID).toBe('3');
    expect(Array.isArray(preview.violations)).toBe(true);
  });

  it('resuelve sujeto y verbo por categoría cuando el preview no fija entradas', () => {
    const preview = buildClausePreview(lexicon, getDefaultGrammarManifest());

    expect(preview.entries.subject?.ID).toBe('1');
    expect(preview.entries.verb?.ID).toBe('2');
    expect(preview.entries.object).toBeDefined();
  });

  it('no crashea con el léxico vacío (fallback plano)', () => {
    const preview = buildClausePreview([], getDefaultGrammarManifest());
    expect(preview.sentence).toBe('');
    expect(preview.canvas.nodes).toEqual([]);
  });
});

describe('mergeFlexibleGrammar', () => {
  it('fusiona el manifiesto estructurado y registra la procedencia', () => {
    const edited = manifestWithFixedDate();
    const imported = getDefaultGrammarManifest();
    imported.typology = { ...imported.typology, wordOrder: 'OVS' };
    imported.roles = [{ id: 'r1', name: 'Sujeto' }];

    const next = mergeFlexibleGrammar(
      edited,
      flexible({ structured: { manifest: imported, confidence: 0.8, uninterpretedSections: [] } })
    );

    expect(next.typology.wordOrder).toBe('OVS');
    expect(next.roles).toHaveLength(1);
    expect(next.meta.sourceFormat).toBe('markdown');
    expect(next.meta.lastUpdated).not.toBe(FIXED_LAST_UPDATED);
  });

  it('cae al texto crudo cuando no hay manifiesto estructurado', () => {
    const edited = getDefaultGrammarManifest();
    const next = mergeFlexibleGrammar(edited, flexible({ structured: undefined }));

    expect(next.notes).toEqual([expect.stringContaining('Gramática')]);
    expect(next.typology.wordOrder).toBe(edited.typology.wordOrder);
  });

  it('conserva notas estructuradas cuando existen', () => {
    const imported = getDefaultGrammarManifest();
    imported.notes = ['nota estructurada'];
    const next = mergeFlexibleGrammar(
      getDefaultGrammarManifest(),
      flexible({ structured: { manifest: imported, confidence: 1, uninterpretedSections: [] } })
    );

    expect(next.notes).toEqual(['nota estructurada']);
  });
});

describe('mergePreviewConfig', () => {
  it('aplica el default useLexiconAffixes=false y respeta la configuración previa', () => {
    expect(mergePreviewConfig(undefined, {})).toEqual({ useLexiconAffixes: false });
    expect(mergePreviewConfig({ useLexiconAffixes: true }, {})).toEqual({ useLexiconAffixes: true });
    expect(mergePreviewConfig({ useLexiconAffixes: true }, { subjectEntryId: '1' })).toEqual({
      useLexiconAffixes: true,
      subjectEntryId: '1',
    });
  });
});

describe('withLastUpdated', () => {
  it('sella el guardado sin mutar el manifiesto original', () => {
    const manifest = manifestWithFixedDate();
    const next = withLastUpdated(manifest);

    expect(next.meta.lastUpdated).not.toBe(FIXED_LAST_UPDATED);
    expect(manifest.meta.lastUpdated).toBe(FIXED_LAST_UPDATED);
  });
});
