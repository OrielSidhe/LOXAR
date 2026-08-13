/**
 * soundChanger.ts
 * ----------------------------------------------------------------------------
 * Sound Change Applier determinista, síncrono y testeable.
 *
 * Ahora soporta:
 * - Reglas condicionales por entorno (`environment`) con marcadores de posición.
 * - Límite de palabra (`#`) y sílaba (`.`) como delimitadores canónicos.
 * - Aplicación por lote a un léxico completo con resultados trazables.
 * - Historial de snapshots para undo/redo de cambios.
 * ----------------------------------------------------------------------------
 */
import type { LexiconEntry } from '../types';

export interface SoundChangeRule {
  id: string;
  name: string;
  find: string;
  replace: string;
  environment?: string;
  scope?: 'lexeme' | 'root';
  enabled?: boolean;
}

export interface SoundChangeResult {
  entryId: string;
  field: 'lexeme' | 'root';
  original: string;
  changed: string;
  ruleId?: string;
  ruleName?: string;
}

export interface SoundChangeBatchResult {
  results: SoundChangeResult[];
  changedEntryIds: string[];
  entries: LexiconEntry[];
}

export interface SoundChangeHistory {
  snapshots: LexiconDataSnapshot[];
  cursor: number;
}

export interface LexiconDataSnapshot {
  name: string;
  savedAt: string;
  entries: LexiconEntry[];
}

const WORD_START = '#';
const WORD_END = '#';
const SYLLABLE = '.';

export function applyRuleToText(text: string, rule: SoundChangeRule): string {
  if (!rule.find || rule.enabled === false) return text;
  if (!rule.environment) {
    return text.split(rule.find).join(rule.replace);
  }

  return applyEnvironmentRule(text, rule);
}

export function applyEnvironmentRule(text: string, rule: SoundChangeRule): string {
  const find = rule.find;
  const replace = rule.replace;
  const env = rule.environment as string;

  const regex = buildEnvironmentRegex(find, env);
  if (!regex) return text;

  return text.replace(regex, (match) => match.replace(find, replace));
}

export function buildEnvironmentRegex(find: string, environment: string): RegExp | null {
  const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const pattern = environment
    .replace(/\\/g, '')
    .replace(/\./g, SYLLABLE)
    .replace(/#/g, WORD_START)
    .split('_')
    .filter(Boolean);

  if (pattern.length !== 2) {
    return new RegExp(escapedFind, 'g');
  }

  const [left, right] = pattern;

  const leftPattern = left
    ? left
        .split('')
        .map((ch) => (ch === WORD_START ? '\\b' : ch))
        .join('')
    : '';

  const rightPattern = right
    ? right
        .split('')
        .map((ch) => (ch === WORD_END ? '\\b' : ch))
        .join('')
    : '';

  const fullPattern = `${leftPattern}${escapedFind}${rightPattern}`;

  try {
    return new RegExp(fullPattern, 'g');
  } catch {
    return new RegExp(escapedFind, 'g');
  }
}

export function applyRulesToText(text: string, rules: SoundChangeRule[]): string {
  return rules.reduce((current, rule) => applyRuleToText(current, rule), text);
}

export function previewSoundChange(text: string, rules: SoundChangeRule[]): string {
  return applyRulesToText(text, rules);
}

export function applySoundChangeToEntry(entry: LexiconEntry, rule: SoundChangeRule): SoundChangeResult | null {
  if (rule.enabled === false) return null;

  const sourceRoot = String(entry.Raíz ?? '');
  const sourceLexeme = (entry.Léxema || []).join(' ');

  const rootChanged = applyRuleToText(sourceRoot, rule);
  const lexemeChanged = applyRuleToText(sourceLexeme, rule);

  const results: SoundChangeResult[] = [];

  if (rootChanged !== sourceRoot) {
    results.push({
      entryId: entry.ID,
      field: 'root',
      original: sourceRoot,
      changed: rootChanged,
      ruleId: rule.id,
      ruleName: rule.name,
    });
  }

  if (lexemeChanged !== sourceLexeme) {
    results.push({
      entryId: entry.ID,
      field: 'lexeme',
      original: sourceLexeme,
      changed: lexemeChanged,
      ruleId: rule.id,
      ruleName: rule.name,
    });
  }

  return results[0] ?? null;
}

export function applySoundChangesToLexicon(lexicon: LexiconDataSnapshot['entries'], rules: SoundChangeRule[]): SoundChangeBatchResult {
  const results: SoundChangeResult[] = [];
  const changedEntryIds: string[] = [];
  const entries = lexicon.map((entry) => {
    const entryResults: SoundChangeResult[] = [];
    let currentRoot = String(entry.Raíz ?? '');
    let currentLexeme = (entry.Léxema || []).join(' ');
    let changed = false;

    for (const rule of rules) {
      const rootResult = applySoundChangeToEntry({ ...entry, Raíz: currentRoot, Léxema: currentLexeme.split(' ') }, rule);
      if (rootResult) {
        entryResults.push(rootResult);
        if (rootResult.field === 'root') currentRoot = rootResult.changed;
        if (rootResult.field === 'lexeme') currentLexeme = rootResult.changed;
        changed = true;
      }
    }

    if (!changed) return entry;

    changedEntryIds.push(entry.ID);
    results.push(...entryResults);

    return {
      ...entry,
      Raíz: currentRoot,
      Léxema: currentLexeme.split(' ').filter(Boolean),
    } as LexiconEntry;
  });

  return { results, changedEntryIds, entries };
}

export function createSnapshot(entries: LexiconEntry[], name: string): LexiconDataSnapshot {
  return {
    name,
    savedAt: new Date().toISOString(),
    entries: entries.map((entry) => ({ ...entry })),
  };
}

export function canUndo(history: SoundChangeHistory): boolean {
  return history.cursor > 0;
}

export function canRedo(history: SoundChangeHistory): boolean {
  return history.cursor < history.snapshots.length - 1;
}

export function undo(history: SoundChangeHistory): SoundChangeHistory | null {
  if (!canUndo(history)) return null;
  const cursor = history.cursor - 1;
  return { ...history, cursor };
}

export function redo(history: SoundChangeHistory): SoundChangeHistory | null {
  if (!canRedo(history)) return null;
  const cursor = history.cursor + 1;
  return { ...history, cursor };
}

