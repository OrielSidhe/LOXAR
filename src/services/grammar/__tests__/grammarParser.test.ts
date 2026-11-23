import { describe, it, expect } from 'vitest';
import { convertToLegacy } from '../../grammarParser';
import type { DeclarativeManifest } from '../declarativeFormat';
import type { GrammarManifest, SlotRealization } from '../../../types';

const baseManifest = (): DeclarativeManifest => ({
  name: 'Test',
  typology: {
    wordOrder: 'SVO',
    morphology: 'agglutinative',
    headDirection: 'head-initial',
    alignment: 'Nominative-Accusative',
  },
  phonology: { consonants: ['p'], vowels: ['a'], syllableStructures: ['CV'] },
  paradigms: [],
  strategies: [],
  mutationRules: [],
  exceptions: [],
  roles: [],
});

describe('convertToLegacy', () => {
  it('maps every declarative strategy type onto the canonical engine StrategyType', () => {
    const manifest = baseManifest();
    manifest.strategies = ([
      'position',
      'affix',
      'clitic',
      'tone',
      'mutation',
      'particle',
      'auxiliary',
      'suppletion',
    ] as const).map((type, i) => ({ id: `s${i}`, name: type, type }));

    const legacy: GrammarManifest = convertToLegacy(manifest);

    expect(legacy.strategies.map((s) => s.type)).toEqual([
      'position',
      'affix',
      'clitic',
      'tone',
      'mutation',
      'particle',
      'auxiliary',
      // suppletion has no morphological realization of its own in the engine.
      'affix',
    ]);
  });

  it('defaults an affix realization without explicit position to suffix', () => {
    const manifest = baseManifest();
    manifest.paradigms = [
      {
        category: 'verbo',
        slots: [{ id: 'pl', feature: 'number', order: 1, realization: { kind: 'affix', form: '-il' } }],
      },
    ];

    const legacy = convertToLegacy(manifest);

    expect(legacy.paradigms[0].slots[0].realization).toEqual({
      kind: 'affix',
      position: 'suffix',
      form: '-il',
    } satisfies SlotRealization);
  });

  it('narrows each declarative realization kind into its canonical member', () => {
    const manifest = baseManifest();
    manifest.paradigms = [
      {
        category: 'verbo',
        slots: [
          { id: 'a', feature: 'tense', order: 1, realization: { kind: 'mutation', form: 'm1' } },
          { id: 'b', feature: 'aspect', order: 2, realization: { kind: 'tone', form: 't1' } },
          { id: 'c', feature: 'person', order: 3, realization: { kind: 'stem', form: 'fui' } },
          { id: 'd', feature: 'polarity', order: 4, realization: { kind: 'particle', form: 'vo' } },
        ],
      },
    ];

    const legacy = convertToLegacy(manifest);

    expect(legacy.paradigms[0].slots.map((s) => s.realization)).toEqual([
      { kind: 'mutation', ruleId: 'm1' },
      { kind: 'tone', ruleId: 't1' },
      { kind: 'stem', replace: 'fui' },
      { kind: 'particle', form: 'vo' },
    ]);
  });

  it('keeps an explicit affix position instead of overriding it', () => {
    const manifest = baseManifest();
    manifest.paradigms = [
      {
        category: 'verbo',
        slots: [
          {
            id: 'pre',
            feature: 'tense',
            order: 1,
            realization: { kind: 'affix', form: 'ka-', position: 'prefix' },
          },
        ],
      },
    ];

    const legacy = convertToLegacy(manifest);

    expect(legacy.paradigms[0].slots[0].realization).toEqual({
      kind: 'affix',
      position: 'prefix',
      form: 'ka-',
    });
  });
});
