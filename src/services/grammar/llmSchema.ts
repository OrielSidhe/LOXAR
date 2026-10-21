/**
 * llmSchema.ts — Zod validation schema for LLM-produced DeclarativeManifest.
 *
 * The LLM is instructed to return JSON matching the DeclarativeManifest contract
 * (see LLM_PROMPT_TEMPLATE in inductFromText.ts). This schema performs STRICT
 * structural validation so that malformed or hallucinated output is rejected
 * before merging. Field *values* are validated structurally but aliases /
 * non-canonical strings are allowed — normalization happens afterward in
 * normalizer.ts.
 *
 * Design decisions:
 *  - .default() on optional fields ensures the parsed manifest always has a
 *    complete structure even if the LLM omits a key.
 *  - .trim() on string fields prevents whitespace-only junk.
 *  - z.strictObject is NOT used — the LLM may add harmless extra keys; we
 *    strip unknowns via .strip() at the top level.
 */

import { z } from 'zod';
import type { DeclarativeManifest } from './declarativeFormat';

// ── Reusable primitives ──────────────────────────────────────────────────────

const zNonEmptyString = z.string().min(1).trim();

// ── Enum schemas (must match declarativeFormat.ts) ──────────────────────────

const WordOrderEnum = z.enum(['SVO', 'SOV', 'VSO', 'VOS', 'OVS', 'OSV']);
const MorphologyEnum = z.enum(['isolating', 'agglutinative', 'fusional', 'polysynthetic']);
const HeadDirectionEnum = z.enum(['head-initial', 'head-final']);

const MorphemeKindEnum = z.enum(['affix', 'mutation', 'tone', 'stem', 'particle']);
const AffixPositionEnum = z.enum(['prefix', 'suffix', 'infix', 'circumflex']);
// NOTE: 'circumflex' is a deliberate typo-safe alias; the LLM sometimes
// produces "circumfix" which is the canonical value. We accept both and
// normalize later.
const AffixPositionLooseEnum = z.enum([
  'prefix', 'suffix', 'infix', 'circumfix', 'circumflex',
]);

// StrategyType from declarativeFormat.ts
const StrategyTypeEnum = z.enum([
  'position', 'affix', 'clitic', 'tone', 'mutation',
  'particle', 'auxiliary', 'suppletion',
]);

const ClauseTypeIdEnum = z.enum([
  'subject', 'object', 'modifier', 'particle', 'auxiliary_verb', 'root',
]);

// ── Nested schemas ───────────────────────────────────────────────────────────

const zSlot = z.object({
  id: z.string(),
  feature: z.string(),
  order: z.number().int().nonnegative(),
  realization: z.object({
    kind: MorphemeKindEnum,
    form: zNonEmptyString,
    when: z.string().optional(),
    position: AffixPositionLooseEnum.optional(),
  }),
});

const zParadigm = z.object({
  category: z.string(),
  slots: z.array(zSlot).default([]),
});

const zStrategy = z.object({
  id: z.string(),
  name: z.string(),
  type: StrategyTypeEnum,
  appliesTo: z.array(z.string()).optional(),
  appliesToCategories: z.array(z.string()).optional(),
  positionRule: z.object({
    anchor: z.enum(['verb', 'noun', 'sentence_start', 'sentence_end']),
    relation: z.enum(['before', 'after']),
    distance: z.number().int().nonnegative(),
  }).optional(),
  affixRule: z.object({
    position: z.string(),
    form: zNonEmptyString,
    allomorphs: z.array(z.object({
      condition: z.string(),
      form: z.string(),
    })).optional(),
  }).optional(),
  particleRule: z.object({
    marker: zNonEmptyString,
    relativePosition: z.enum(['before', 'after']),
    distance: z.number().int().nonnegative().optional(),
  }).optional(),
  cliticRule: z.object({
    form: zNonEmptyString,
    hostPosition: z.enum(['proclitic', 'enclitic', 'mesoclitic']),
  }).optional(),
  auxiliaryRule: z.object({
    auxiliaryForm: zNonEmptyString,
    order: z.enum(['aux_before', 'aux_after']),
    mainVerbForm: zNonEmptyString,
  }).optional(),
  toneRule: z.object({
    description: zNonEmptyString,
    pattern: z.string().optional(),
  }).optional(),
  transformationRule: z.object({
    pattern: zNonEmptyString,
    replacement: zNonEmptyString,
  }).optional(),
  notes: z.string().optional(),
});

const zMutationRule = z.object({
  id: z.string(),
  name: z.string(),
  pattern: zNonEmptyString,
  replacement: zNonEmptyString,
  scope: z.enum(['consonant', 'vowel', 'tone']),
});

const zException = z.object({
  id: z.string(),
  ruleDescription: zNonEmptyString,
  exceptionPattern: zNonEmptyString,
  context: z.string(),
  example: z.string().optional(),
});

const zRole = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const zTypology = z.object({
  wordOrder: WordOrderEnum,
  morphology: MorphologyEnum,
  headDirection: HeadDirectionEnum,
  alignment: z.string(),
});

const zPhonology = z.object({
  consonants: z.array(z.string()).default([]),
  vowels: z.array(z.string()).default([]),
  syllableStructures: z.array(z.string()).default([]),
});

// ── Top-level schema ─────────────────────────────────────────────────────────

/**
 * Zod schema for validating LLM output of the DeclarativeManifest format.
 * Use: `zDeclManifest.parse(jsonObj)` — throws on invalid structure.
 * The result is a fully-populated DeclarativeManifest with defaults filled in.
 */
export const zDeclManifest = z.object({
  name: z.string().default('Imported'),
  typology: z.object({
    wordOrder: WordOrderEnum.default('SVO'),
    morphology: MorphologyEnum.default('isolating'),
    headDirection: HeadDirectionEnum.default('head-initial'),
    alignment: z.string().default('nominative'),
  }).default({
    wordOrder: 'SVO',
    morphology: 'isolating',
    headDirection: 'head-initial',
    alignment: 'nominative',
  }),
  phonology: zPhonology.default({
    consonants: [],
    vowels: [],
    syllableStructures: ['CV'],
  }),
  paradigms: z.array(zParadigm).default([]),
  strategies: z.array(zStrategy).default([]),
  mutationRules: z.array(zMutationRule).default([]),
  exceptions: z.array(zException).default([]),
  roles: z.array(zRole).default([]),
}).strip() as unknown as z.ZodType<DeclarativeManifest>;

/**
 * Safe-parse wrapper. Returns parsed manifest or null + error message.
 */
export function validateLlmManifest(data: unknown): { ok: true; manifest: DeclarativeManifest } | { ok: false; error: string } {
  try {
    const manifest = zDeclManifest.parse(data);
    return { ok: true, manifest };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown validation error' };
  }
}

export { z as zodExport };
