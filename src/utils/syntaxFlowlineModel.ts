/**
 * syntaxFlowlineModel.ts — Modelo puro del SyntaxFlowline (Sintaxis Lego)
 * ──────────────────────────────────────────────────────────────────────
 * Extraído de `src/components/SyntaxFlowline.tsx` (P1, descomposición del
 * componente gigante). Contiene los tipos, las constantes de dominio, la
 * construcción de bloques desde el manifiesto de gramática, la persistencia
 * en `localStorage` y las helpers puras que los tests ejercitan.
 *
 * El componente `.tsx` solo orquesta estado de UI y render; toda la lógica de
 * dominio vive acá. Los exports que los tests importan desde el componente
 * siguen disponibles porque `SyntaxFlowline.tsx` los re-exporta.
 */

import type { GrammarManifest, LexiconEntry } from '../types';

// ── Types ──────────────────────────────────────────────

/** Valor de un pin: null = vacío, o un lexema/palabra con metadata */
export type PinValue = { root: string; function: string; meaning: string; lexeme?: LexiconEntry } | null;

export type PinDef = {
  id: string;
  label: string;
  expectedFunction: string;     // taxonomy function key
  required: boolean;
  value: PinValue;
  options?: string[];           // opciones predefinidas (género, caso, etc.)
  feature?: string;             // G5: morfological feature name (e.g. 'case', 'tense')
  morphoCategory?: string;      // G5/G6: category in manifest (e.g. 'sustantivo', 'verbo')
};

export type FlowlineBlock = {
  id: string;
  label: string;
  icon: string;
  color: string;
  roleId: string;               // G1: maps to manifest.roles entry
  pins: PinDef[];
  expanded: boolean;
};

/** Definición de bloque por defecto (fallback sin manifiesto) */
export type DefaultBlockDef = {
  id: string;
  label: string;
  icon: string;
  color: string;
  roleId: string;
  pinFunction: string;
  pinLabel: string;
  required: boolean;
  options?: string[];
  feature?: string;
  morphoCategory?: string;
};

// ── Constants ─────────────────────────────────────────

export const STORAGE_KEY = 'loxar_syntax_flowline_v1';

export const PLACEHOLDER_LEXEME = '— arrastrá un lexema —';
export const PLACEHOLDER_SELECT = '— seleccioná —';

export const BLOCK_ICONS: Record<string, string> = {
  subject: '🏷️',
  verb: '⚡',
  object: '🎯',
  modifier: '✨',
  adjunct: '➕',
  predicate: '📍',
};

export const BLOCK_COLORS: Record<string, string> = {
  subject: 'cyan',
  verb: 'purple',
  object: 'amber',
  modifier: 'emerald',
  adjunct: 'pink',
  predicate: 'indigo',
};

export const ROLE_TO_LABEL: Record<string, string> = {
  subject: 'SUJETO',
  verb: 'VERBO',
  object: 'OBJETO',
  modifier: 'MODIFICADOR',
  adjunct: 'ADJUNTO',
  predicate: 'PREDICADO',
};

export const ROLE_TO_FUNCTION: Record<string, string> = {
  subject: 'sustantivo',
  verb: 'verbo',
  object: 'sustantivo',
  modifier: 'adjetivo',
  adjunct: 'adverbio',
  predicate: 'verbo',
};

// G1: Default blocks when no grammar manifest is available (fallback)
export const DEFAULT_BLOCK_DEFS: DefaultBlockDef[] = [
  { id: 'subject', label: 'SUJETO', icon: '🏷️', color: 'cyan', roleId: 'subject', pinFunction: 'sustantivo', pinLabel: 'Raíz', required: true },
  { id: 'verb', label: 'VERBO', icon: '⚡', color: 'purple', roleId: 'verb', pinFunction: 'verbo', pinLabel: 'Raíz verbal', required: true },
  { id: 'object', label: 'OBJETO', icon: '🎯', color: 'amber', roleId: 'object', pinFunction: 'sustantivo', pinLabel: 'Raíz', required: false },
  { id: 'modifier', label: 'MODIFICADOR', icon: '✨', color: 'emerald', roleId: 'modifier', pinFunction: 'adjetivo', pinLabel: 'Raíz', required: false },
];

// G1: Word order → canonical block sequence
export const ORDER_BLOCK_MAP: Record<string, string[]> = {
  SVO: ['subject', 'verb', 'object'],
  SOV: ['subject', 'object', 'verb'],
  VSO: ['verb', 'subject', 'object'],
  VOS: ['verb', 'object', 'subject'],
  OVS: ['object', 'verb', 'subject'],
  OSV: ['object', 'subject', 'verb'],
};

/** G6: Extract morphological properties from the manifest's paradigms.
 *  Each CategoryParadigm has slots with `feature` and optional `realization`.
 *  We collect the distinct feature names + the realization forms as options.
 *  Falls back to hardcoded defaults when no manifest is available. */
export function extractMorphologicalProperties(
  manifest: GrammarManifest | undefined
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  if (!manifest || !manifest.paradigms || manifest.paradigms.length === 0) {
    return result;
  }

  for (const paradigm of manifest.paradigms) {
    const category = paradigm.category || 'unknown';
    if (!result[category]) result[category] = [];

    for (const slot of (paradigm.slots ?? [])) {
      const feature = slot.feature;
      if (!feature) continue;

      // Collect option values from the realization
      if (slot.realization) {
        if (slot.realization.kind === 'affix' && slot.realization.form) {
          result[category].push(`${feature}=${slot.realization.form}`);
        }
        if (slot.realization.kind === 'particle' && slot.realization.form) {
          result[category].push(`${feature}=${slot.realization.form}`);
        }
      }

      // Collect from allomorphs
      for (const allo of (slot.allomorphs ?? [])) {
        if (allo.realization) {
          if (allo.realization.kind === 'affix' && allo.realization.form) {
            result[category].push(`${feature}=${allo.realization.form}`);
          }
          if (allo.realization.kind === 'particle' && allo.realization.form) {
            result[category].push(`${feature}=${allo.realization.form}`);
          }
        }
      }
    }
  }

  return result;
}

/** G6: Extract available options for a specific feature from the manifest.
 *  Returns the raw form values (e.g. ['nominativo', 'acusativo']) for a
 *  given category + feature. Falls back to hardcoded lists. */
export function getMorphoOptions(
  manifest: GrammarManifest | undefined,
  category: string,
  feature: string
): string[] | undefined {
  if (!manifest || !manifest.paradigms) return undefined;

  const paradigm = manifest.paradigms.find(p => p.category === category);
  if (!paradigm) {
    // Try matching function key to paradigm category
    const funcToCat: Record<string, string> = {
      sustantivo: 'noun', verbo: 'verb', adjetivo: 'adjective',
    };
    const matchedCat = funcToCat[category] || category;
    const altParadigm = manifest.paradigms.find(p => p.category === matchedCat);
    if (!altParadigm) return undefined;
    const slots = altParadigm.slots.filter(s => s.feature === feature);
    const options: string[] = [];
    for (const slot of slots) {
      if (slot.realization?.kind === 'affix' && slot.realization.form) {
        options.push(slot.realization.form);
      }
      for (const allo of (slot.allomorphs ?? [])) {
        if (allo.realization?.kind === 'affix' && allo.realization.form) {
          options.push(allo.realization.form);
        }
      }
    }
    return options.length > 0 ? options : undefined;
  }

  const slots = paradigm.slots.filter(s => s.feature === feature);
  const options: string[] = [];
  for (const slot of slots) {
    if (slot.realization?.kind === 'affix' && slot.realization.form) {
      options.push(slot.realization.form);
    }
    for (const allo of (slot.allomorphs ?? [])) {
      if (allo.realization?.kind === 'affix' && allo.realization.form) {
        options.push(allo.realization.form);
      }
    }
  }
  return options.length > 0 ? options : undefined;
}

/** Fallback morphological properties (G6 fallback when no manifest) */
export const FALLBACK_OPTIONS: Record<string, Record<string, string[]>> = {
  case: {
    options: ['nominativo', 'acusativo', 'dativo', 'genitivo', 'vocativo', 'instrumental', 'locativo'],
  },
  conj: {
    options: ['-é (presente)', '-as (pasado)', '-ila (futuro)', '-en (compuesto)'],
  },
};

/** Build default flowline blocks from grammar manifest (G1 + G6) */
export function buildBlocksFromManifest(manifest: GrammarManifest | undefined): FlowlineBlock[] {
  if (!manifest) {
    // Fallback: hardcoded defaults from original component (G6 fallback)
    return DEFAULT_BLOCK_DEFS.map(def => {
      const pins: PinDef[] = [
        { id: 'root', label: def.pinLabel, expectedFunction: def.pinFunction, required: def.required, value: null },
      ];
      // Add fallback feature pins for subject/object/verb
      if (def.roleId === 'subject' || def.roleId === 'object') {
        pins.push({
          id: 'case', label: 'Caso', expectedFunction: 'caso', required: false, value: null,
          options: FALLBACK_OPTIONS.case.options,
          feature: 'case',
          morphoCategory: def.pinFunction,
        });
      }
      if (def.roleId === 'verb') {
        pins.push({
          id: 'conj', label: 'Conjugación', expectedFunction: 'conjugacion', required: false, value: null,
          options: FALLBACK_OPTIONS.conj.options,
          feature: 'tense',
          morphoCategory: def.pinFunction,
        });
      }
      return {
        id: def.id,
        label: def.label,
        icon: def.icon,
        color: def.color,
        roleId: def.roleId,
        expanded: false,
        pins,
      };
    });
  }

  const wordOrder = manifest.typology?.wordOrder || 'SVO';
  const orderKeys = (ORDER_BLOCK_MAP[wordOrder.toUpperCase()] || ORDER_BLOCK_MAP.SVO);

  // G1: Use manifest.roles to determine which blocks to show
  // Map word order position to syntactic role
  const roleForBlock = (position: string): string => {
    const roleMap: Record<string, string> = {
      subject: 'subject',
      verb: 'verb',
      object: 'object',
    };
    return roleMap[position] || 'subject';
  };

  const blocks: FlowlineBlock[] = orderKeys.map((pos, idx) => {
    const roleKey = roleForBlock(pos);
    const role = manifest.roles?.find(r => r.id === roleKey) || manifest.roles?.[idx];
    const label = (role?.name || ROLE_TO_LABEL[roleKey] || pos.toUpperCase()).toUpperCase();
    const icon = BLOCK_ICONS[roleKey] || '🧩';
    const color = BLOCK_COLORS[roleKey] || 'gray';

    // G1 + G6: Generate pins based on the role, using manifest paradigmas for options
    const functionKey = ROLE_TO_FUNCTION[roleKey] || 'sustantivo';
    const pins: PinDef[] = [
      { id: 'root', label: 'Raíz', expectedFunction: functionKey, required: true, value: null },
    ];

    // G6: Get case options from manifest paradigm for this category
    if (roleKey === 'subject' || roleKey === 'object') {
      const catInManifest = functionKey; // e.g. 'sustantivo'
      const manifestOptions = getMorphoOptions(manifest, catInManifest, 'case');
      const fallbackOptions = FALLBACK_OPTIONS.case.options;
      pins.push({
        id: 'case', label: 'Caso', expectedFunction: 'caso', required: false, value: null,
        options: manifestOptions || fallbackOptions,
        // G5: Store the feature key for property editing
        feature: 'case',
        morphoCategory: catInManifest,
      });
    }

    // G6: Get conjugation options from manifest paradigm
    if (roleKey === 'verb') {
      const catInManifest = functionKey; // 'verbo'
      const manifestOptions = getMorphoOptions(manifest, catInManifest, 'tense');
      const fallbackOptions = FALLBACK_OPTIONS.conj.options;
      pins.push({
        id: 'conj', label: 'Conjugación', expectedFunction: 'conjugacion', required: false, value: null,
        options: manifestOptions || fallbackOptions,
        feature: 'tense',
        morphoCategory: catInManifest,
      });
    }

    return {
      id: `block_${idx}_${pos}`,
      label,
      icon,
      color,
      roleId: role?.id || roleKey,
      expanded: false,
      pins,
    };
  });

  return blocks;
}

// ── Helpers ───────────────────────────────────────────

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Forma persistida de un pin (sin el lexema completo) */
type SavedPinState = {
  id: string;
  value: { root: string; function: string; meaning: string } | null;
};

/** Forma persistida de un bloque */
type SavedBlockState = {
  id: string;
  expanded?: boolean;
  pins?: SavedPinState[];
};

function isSavedBlockState(value: unknown): value is SavedBlockState {
  return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string';
}

/** G4: Persist flowline state to localStorage */
export function saveState(blocks: FlowlineBlock[]): void {
  try {
    const state = blocks.map(b => ({
      id: b.id,
      label: b.label,
      expanded: b.expanded,
      pins: b.pins.map(p => ({
        id: p.id,
        value: p.value ? { root: p.value.root, function: p.value.function, meaning: p.value.meaning } : null,
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** G4: Restore flowline state from localStorage */
export function loadState(blocks: FlowlineBlock[]): FlowlineBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blocks;
    const saved: unknown = JSON.parse(raw);
    if (!Array.isArray(saved)) return blocks;

    return blocks.map(b => {
      const match = saved.find((s): s is SavedBlockState => isSavedBlockState(s) && s.id === b.id);
      if (!match) return b;
      return {
        ...b,
        expanded: match.expanded ?? b.expanded,
        pins: b.pins.map(p => {
          const savedPin = match.pins?.find(sp => sp.id === p.id);
          return { ...p, value: savedPin?.value ?? null };
        }),
      };
    });
  } catch {
    return blocks;
  }
}

/** G7: Handle drop-outside — returns the piece to the inventory (palette).
 *  The piece is never destroyed: we simply remove it from the flowline.
 *  If it was a standalone block, it gets removed from the line.
 *  If it was a pin value, it gets cleared.
 *  In both cases, the piece "returns" to the lexicon palette conceptually.
 */
export function handleDropOutside(
  blocks: FlowlineBlock[],
  blockId: string | null,
  pinId: string | null
): FlowlineBlock[] {
  if (!blockId && !pinId) return blocks;

  // If only a pin is specified, clear the pin value
  if (!blockId && pinId) {
    return blocks;
  }

  if (blockId && pinId) {
    // Clear the specific pin value
    return blocks.map(b =>
      b.id === blockId
        ? {
            ...b,
            pins: b.pins.map(p =>
              p.id === pinId ? { ...p, value: null } : p
            ),
          }
        : b
    );
  }

  // Block-level drop-out: remove the block from the flowline (returns to inventory)
  if (blockId) {
    return blocks.filter(b => b.id !== blockId);
  }

  return blocks;
}
