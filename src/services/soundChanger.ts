/**
 * soundChanger.ts
 * ----------------------------------------------------------------------------
 * Sound Change Applier simple, determinista y puramente síncrono.
 *
 * Aplica reglas tipo “replace” a Léxemas/Raíces de un LexiconEntry.
 * Sin estado, sin IO, fácil de testear.
 * ----------------------------------------------------------------------------
 */
import type { LexiconEntry } from '../types';

export interface SoundChangeRule {
  id: string;
  name: string;
  environment?: string;
  find: string;
  replace: string;
  scope?: 'lexeme' | 'root';
  enabled?: boolean;
}

export interface SoundChangeResult {
  entryId: string;
  original: string;
  changed: string;
  ruleId?: string;
}

export function applySoundChangeToEntry(entry: LexiconEntry, rule: SoundChangeRule): SoundChangeResult | null {
  if (rule.enabled === false) return null;

  const source = rule.scope === 'root' ? entry.Raíz : entry.Léxema.join(' ');
  const changed = applyRuleToText(source, rule);
  if (changed === source) return null;

  return {
    entryId: entry.ID,
    original: source,
    changed,
    ruleId: rule.id,
  };
}

export function applyRuleToText(text: string, rule: SoundChangeRule): string {
  if (!rule.find) return text;
  const find = String(rule.find);
  const replace = String(rule.replace);
  return text.split(find).join(replace);
}

export function applyRulesToText(text: string, rules: SoundChangeRule[]): string {
  return rules.reduce((current, rule) => applyRuleToText(current, rule), text);
}

export function previewSoundChange(text: string, rules: SoundChangeRule[]): string {
  return applyRulesToText(text, rules);
}
