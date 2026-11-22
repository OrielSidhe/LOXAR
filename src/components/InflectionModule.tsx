/**
 * InflectionModule.tsx
 * ────────────────────
 * Editor de morfologia (flexion) del conlang: paradigmas de conjugacion/
 * declinacion, reglas simples y condicionales, y reglas fonologicas con
 * previsualizacion en vivo.
 *
 * Reemplaza a los dos componentes huerfanos `InflectionModal.tsx` (443 lineas)
 * e `InflectionView.tsx` (541): eran copias casi identicas entre si y ninguna
 * estaba montada, asi que el perfil de flexion (`InflectionProfile`) no tenia
 * forma de editarse desde la UI pese a persistirse por lexico.
 *
 * Contrato:
 *  - estado local `localProfile`; se sincroniza cuando `profile` cambia desde
 *    afuera (cambio de lexico / restauracion de proyecto);
 *  - el guardado es explicito (`onSave`) y pasa por `useLexicon.updateInflectionProfile`,
 *    que marca dirty y persiste;
 *  - la logica pura vive en `src/utils/inflectionModuleModel.ts`.
 */

import { useEffect, useMemo, useState } from 'react';
import type { InflectionParadigm, InflectionProfile, InflectionRule } from '../types';
import {
  EMPTY_PHONOLOGICAL_DRAFT,
  EMPTY_RULE_DRAFT,
  PHONOLOGICAL_PRESETS,
  addParadigmGroup,
  addPhonologicalRule,
  addRuleToGroup,
  deletePhonologicalRule,
  deleteParadigmGroup,
  deleteRuleFromGroup,
  findParadigmGroup,
  normalizeInflectionProfile,
  previewPhonologicalRules,
  renameParadigmGroup,
  replaceRuleInGroup,
  type NewPhonologicalRuleDraft,
  type NewRuleDraft,
} from '../utils/inflectionModuleModel';

export interface InflectionModuleProps {
  profile: InflectionProfile;
  onSave: (profile: InflectionProfile) => void;
  onClose: () => void;
}

type ModuleTab = 'paradigms' | 'phonology';

/** Editor inline de una regla (simple o condicional). */
const RuleEditor = ({
  rule,
  onUpdate,
  onSave,
  onCancel,
}: {
  rule: InflectionRule;
  onUpdate: (updates: Partial<InflectionRule>) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <div className="p-2 bg-background rounded-md space-y-2">
    <input
      type="text"
      value={rule.name}
      onChange={e => onUpdate({ name: e.target.value })}
      placeholder="Nombre (ej: Plural)"
      className="w-full bg-surface border border-subtle rounded py-1 px-2 text-sm"
    />
    {rule.type === 'simple' ? (
      <input
        type="text"
        value={rule.template}
        onChange={e => onUpdate({ template: e.target.value })}
        placeholder="Plantilla con [RAÍZ]"
        className="w-full bg-surface border border-subtle rounded py-1 px-2 text-sm font-mono"
      />
    ) : (
      <div className="grid grid-cols-2 gap-2 text-sm">
        <select
          value={rule.conditionType}
          onChange={e => onUpdate({ conditionType: e.target.value as InflectionRule extends { conditionType: infer T } ? T : never })}
          className="bg-surface border border-subtle rounded py-1 px-2"
        >
          <option value="endsWith">Si termina con</option>
          <option value="startsWith">Si empieza con</option>
          <option value="contains">Si contiene</option>
        </select>
        <input
          type="text"
          value={rule.conditionValue}
          onChange={e => onUpdate({ conditionValue: e.target.value })}
          placeholder="Valor..."
          className="bg-surface border border-subtle rounded py-1 px-2"
        />
        <select
          value={rule.actionType}
          onChange={e => onUpdate({ actionType: e.target.value as InflectionRule extends { actionType: infer T } ? T : never })}
          className="bg-surface border border-subtle rounded py-1 px-2"
        >
          <option value="replaceEnding">Reemplazar final</option>
          <option value="addSuffix">Añadir sufijo</option>
          <option value="addPrefix">Añadir prefijo</option>
        </select>
        <input
          type="text"
          value={rule.actionValue}
          onChange={e => onUpdate({ actionValue: e.target.value })}
          placeholder="Valor..."
          className="bg-surface border border-subtle rounded py-1 px-2"
        />
      </div>
    )}
    <div className="flex gap-2 justify-end">
      <button onClick={onCancel} className="px-3 py-1 text-sm bg-subtle text-text-primary rounded hover:bg-gray-600">
        Cancelar
      </button>
      <button
        onClick={onSave}
        className="px-3 py-1 text-sm bg-success text-white rounded hover:bg-green-400"
      >
        Guardar regla
      </button>
    </div>
  </div>
);

const InflectionModule = ({ profile, onSave, onClose }: InflectionModuleProps) => {
  const [localProfile, setLocalProfile] = useState<InflectionProfile>(() => normalizeInflectionProfile(profile));
  const [activeTab, setActiveTab] = useState<ModuleTab>('paradigms');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [editingRule, setEditingRule] = useState<InflectionRule | null>(null);
  const [newRule, setNewRule] = useState<NewRuleDraft>(EMPTY_RULE_DRAFT);
  const [newGroupName, setNewGroupName] = useState('');
  const [newPhonoRule, setNewPhonoRule] = useState<NewPhonologicalRuleDraft>(EMPTY_PHONOLOGICAL_DRAFT);
  const [testString, setTestString] = useState('entrada');

  // Sincroniza cuando el lexico activo cambia (el padre pasa otro perfil).
  useEffect(() => {
    setLocalProfile(normalizeInflectionProfile(profile));
    setEditingRule(null);
    setRenamingGroupId(null);
  }, [profile]);

  const selectedGroup = useMemo(
    () => (selectedGroupId ? findParadigmGroup(localProfile.paradigms, selectedGroupId) : null),
    [localProfile.paradigms, selectedGroupId],
  );

  const phonologicalRules = useMemo(() => localProfile.phonologicalRules || [], [localProfile.phonologicalRules]);
  const preview = useMemo(
    () => previewPhonologicalRules(phonologicalRules, testString),
    [phonologicalRules, testString],
  );

  const handleAddGroup = (parentId: string | null) => {
    setLocalProfile(prev => addParadigmGroup(prev, newGroupName, parentId));
    setNewGroupName('');
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este grupo y todo su contenido?')) return;
    setLocalProfile(prev => ({ ...prev, paradigms: deleteParadigmGroup(prev.paradigms, groupId) }));
    if (selectedGroupId === groupId) setSelectedGroupId(null);
  };

  const handleConfirmRename = () => {
    if (!renamingGroupId) return;
    setLocalProfile(prev => renameParadigmGroup(prev, renamingGroupId, renameInput));
    setRenamingGroupId(null);
  };

  const handleAddRule = () => {
    if (!selectedGroupId) return;
    const next = addRuleToGroup(localProfile, selectedGroupId, newRule);
    if (next === localProfile) return;
    setLocalProfile(next);
    setNewRule(EMPTY_RULE_DRAFT);
  };

  const handleConfirmRuleEdit = () => {
    if (!editingRule || !selectedGroupId) return;
    setLocalProfile(prev => replaceRuleInGroup(prev, selectedGroupId, editingRule));
    setEditingRule(null);
  };

  const handleAddPhonologicalRule = () => {
    const next = addPhonologicalRule(localProfile, newPhonoRule);
    if (next === localProfile) return;
    setLocalProfile(next);
    setNewPhonoRule(EMPTY_PHONOLOGICAL_DRAFT);
  };

  const handleSave = () => {
    onSave(localProfile);
  };

  /** Arbol de grupos con acciones por nodo. */
  const renderGroup = (group: InflectionParadigm, depth: number) => {
    const isSelected = selectedGroupId === group.id;
    const isRenaming = renamingGroupId === group.id;

    return (
      <div key={group.id} className="space-y-1" style={{ marginLeft: depth === 0 ? 0 : 16 }}>
        <div
          className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
            isSelected ? 'bg-accent/15 border-accent/40' : 'bg-surface-dark border-border-dark hover:border-white/20'
          }`}
        >
          <button
            onClick={() => setSelectedGroupId(isSelected ? null : group.id)}
            className="text-xs text-text-secondary hover:text-accent"
            aria-label={isSelected ? 'Cerrar grupo' : 'Abrir grupo'}
          >
            {isSelected ? '▼' : '▶'}
          </button>
          {isRenaming ? (
            <input
              type="text"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
              autoFocus
              className="flex-grow bg-surface border border-accent rounded py-1 px-2 text-sm"
            />
          ) : (
            <span className="flex-grow text-sm font-semibold text-text-primary">{group.name}</span>
          )}
          <span className="text-[10px] text-text-secondary bg-background px-2 py-0.5 rounded-full">
            {group.rules.length} regla{group.rules.length === 1 ? '' : 's'}
          </span>
          {isRenaming ? (
            <>
              <button onClick={handleConfirmRename} className="text-xs text-success hover:text-green-400">
                Guardar
              </button>
              <button onClick={() => setRenamingGroupId(null)} className="text-xs text-text-secondary hover:text-white">
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setRenamingGroupId(group.id);
                  setRenameInput(group.name);
                }}
                className="text-xs text-text-secondary hover:text-accent"
              >
                Renombrar
              </button>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="text-xs text-text-secondary hover:text-danger"
              >
                Eliminar
              </button>
            </>
          )}
        </div>

        {isSelected && (
          <div className="space-y-2 pl-2">
            {group.rules.map(rule => (
              <div key={rule.id} className="p-2 bg-background rounded-md">
                {editingRule?.id === rule.id ? (
                  <RuleEditor
                    rule={editingRule}
                    onUpdate={updates => setEditingRule(prev => (prev ? ({ ...prev, ...updates } as InflectionRule) : prev))}
                    onSave={handleConfirmRuleEdit}
                    onCancel={() => setEditingRule(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{rule.name}</p>
                      <p className="text-xs text-text-secondary font-mono truncate">
                        {rule.type === 'simple'
                          ? rule.template
                          : `si ${rule.conditionType} ${rule.conditionValue} → ${rule.actionType} ${rule.actionValue}`}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditingRule({ ...rule })}
                        className="text-xs text-text-secondary hover:text-accent"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setLocalProfile(prev => deleteRuleFromGroup(prev, group.id, rule.id))}
                        className="text-xs text-text-secondary hover:text-danger"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="p-2 bg-surface rounded-md space-y-2">
              <p className="text-xs font-semibold text-text-secondary">Añadir regla al grupo</p>
              <input
                type="text"
                value={newRule.name}
                onChange={e => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre (ej: Plural)"
                className="w-full bg-background border border-subtle rounded py-1 px-2 text-sm"
              />
              <select
                value={newRule.type}
                onChange={e => setNewRule(prev => ({ ...prev, type: e.target.value as 'simple' | 'conditional' }))}
                className="w-full bg-background border border-subtle rounded py-1 px-2 text-sm"
              >
                <option value="simple">Simple (plantilla)</option>
                <option value="conditional">Condicional</option>
              </select>
              {newRule.type === 'simple' ? (
                <input
                  type="text"
                  value={newRule.template}
                  onChange={e => setNewRule(prev => ({ ...prev, template: e.target.value }))}
                  placeholder="Plantilla con [RAÍZ]"
                  className="w-full bg-background border border-subtle rounded py-1 px-2 text-sm font-mono"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <select
                    value={newRule.conditionType}
                    onChange={e =>
                      setNewRule(prev => ({
                        ...prev,
                        conditionType: e.target.value as NewRuleDraft['conditionType'],
                      }))
                    }
                    className="bg-background border border-subtle rounded py-1 px-2"
                  >
                    <option value="endsWith">Si termina con</option>
                    <option value="startsWith">Si empieza con</option>
                    <option value="contains">Si contiene</option>
                  </select>
                  <input
                    type="text"
                    value={newRule.conditionValue}
                    onChange={e => setNewRule(prev => ({ ...prev, conditionValue: e.target.value }))}
                    placeholder="Valor..."
                    className="bg-background border border-subtle rounded py-1 px-2"
                  />
                  <select
                    value={newRule.actionType}
                    onChange={e =>
                      setNewRule(prev => ({ ...prev, actionType: e.target.value as NewRuleDraft['actionType'] }))
                    }
                    className="bg-background border border-subtle rounded py-1 px-2"
                  >
                    <option value="replaceEnding">Reemplazar final</option>
                    <option value="addSuffix">Añadir sufijo</option>
                    <option value="addPrefix">Añadir prefijo</option>
                  </select>
                  <input
                    type="text"
                    value={newRule.actionValue}
                    onChange={e => setNewRule(prev => ({ ...prev, actionValue: e.target.value }))}
                    placeholder="Valor..."
                    className="bg-background border border-subtle rounded py-1 px-2"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.name.trim()}
                  className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
                >
                  + Añadir regla
                </button>
              </div>
            </div>
          </div>
        )}

        {group.paradigms?.map(child => renderGroup(child, depth + 1))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Morfología y flexión"
    >
      <div className="bg-surface rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-subtle">
        <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Morfología y Flexión</h2>
            <p className="text-sm text-text-secondary">
              Define paradigmas de conjugación o declinación y reglas fonológicas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:bg-subtle"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <nav className="flex gap-1 p-2 border-b border-subtle flex-shrink-0">
          {(['paradigms', 'phonology'] as ModuleTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-white'
              }`}
            >
              {tab === 'paradigms' ? 'Paradigmas' : 'Reglas fonológicas'}
            </button>
          ))}
        </nav>

        <main className="flex-grow overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'paradigms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddGroup(null)}
                    placeholder="Nombre del paradigma (ej: 1ª conjugación)"
                    className="flex-grow bg-background border border-subtle rounded-md py-2 px-3 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    onClick={() => handleAddGroup(null)}
                    disabled={!newGroupName.trim()}
                    className="px-3 py-2 bg-accent text-white rounded-md text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
                  >
                    + Grupo
                  </button>
                </div>
                {localProfile.paradigms.length === 0 ? (
                  <p className="text-sm text-text-secondary italic p-3">
                    No hay paradigmas. Crea el primero para empezar.
                  </p>
                ) : (
                  localProfile.paradigms.map(group => renderGroup(group, 0))
                )}
              </div>

              <aside className="bg-background/50 border border-subtle rounded-lg p-4 space-y-3 self-start">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Ayuda</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Un <strong>paradigma</strong> agrupa reglas de flexión. Seleccionalo para añadir reglas simples
                  (plantilla con <code className="font-mono">[RAÍZ]</code>) o condicionales (si la base cumple una
                  condición, aplícale una acción).
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Las reglas se aplican en orden sobre la base <code className="font-mono">Léxema[0]</code> o{' '}
                  <code className="font-mono">Raíz</code>, y el resultado puede exportarse desde la tabla del léxico
                  con el botón de flexionar.
                </p>
                {selectedGroup && (
                  <p className="text-xs text-accent">
                    Grupo seleccionado: {selectedGroup.name} · {selectedGroup.rules.length} regla(s)
                  </p>
                )}
              </aside>
            </div>
          )}

          {activeTab === 'phonology' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
                  Reglas fonológicas
                </h3>
                {phonologicalRules.length === 0 ? (
                  <p className="text-sm text-text-secondary italic p-3">No hay reglas fonológicas.</p>
                ) : (
                  phonologicalRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between gap-2 p-2 bg-background rounded-md">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{rule.name}</p>
                        <p className="text-xs text-text-secondary font-mono truncate">
                          {rule.matchPattern} → {rule.replacement || '∅'} {rule.isRegex ? '(regex)' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setLocalProfile(prev => deletePhonologicalRule(prev, rule.id))}
                        className="text-xs text-text-secondary hover:text-danger flex-shrink-0"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))
                )}

                <div className="p-3 bg-surface rounded-md space-y-2">
                  <p className="text-xs font-semibold text-text-secondary">Añadir regla</p>
                  <input
                    type="text"
                    value={newPhonoRule.name}
                    onChange={e => setNewPhonoRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre (ej: Nasalización)"
                    className="w-full bg-background border border-subtle rounded py-1 px-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newPhonoRule.matchPattern}
                      onChange={e => setNewPhonoRule(prev => ({ ...prev, matchPattern: e.target.value }))}
                      placeholder="Patrón"
                      className="bg-background border border-subtle rounded py-1 px-2 text-sm font-mono"
                    />
                    <input
                      type="text"
                      value={newPhonoRule.replacement}
                      onChange={e => setNewPhonoRule(prev => ({ ...prev, replacement: e.target.value }))}
                      placeholder="Reemplazo"
                      className="bg-background border border-subtle rounded py-1 px-2 text-sm font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={newPhonoRule.isRegex}
                      onChange={e => setNewPhonoRule(prev => ({ ...prev, isRegex: e.target.checked }))}
                    />
                    Es expresión regular
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {PHONOLOGICAL_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => setNewPhonoRule({ ...preset })}
                        className="px-2 py-0.5 text-[10px] bg-background border border-subtle rounded text-text-secondary hover:text-accent"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddPhonologicalRule}
                      disabled={!newPhonoRule.name || !newPhonoRule.matchPattern}
                      className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50"
                    >
                      + Añadir regla
                    </button>
                  </div>
                </div>
              </div>

              <aside className="bg-background/50 border border-subtle rounded-lg p-4 space-y-3 self-start">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Previsualización</h3>
                <input
                  type="text"
                  value={testString}
                  onChange={e => setTestString(e.target.value)}
                  className="w-full bg-background border border-subtle rounded-md py-2 px-3 text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-lg font-mono text-accent break-all">{preview}</p>
                <p className="text-xs text-text-secondary">
                  Las reglas se aplican en orden sobre la entrada. Una regex inválida se ignora.
                </p>
              </aside>
            </div>
          )}
        </main>

        <footer className="p-4 flex justify-end gap-4 border-t border-subtle flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-subtle text-text-primary font-semibold rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors"
          >
            Guardar cambios
          </button>
        </footer>
      </div>
    </div>
  );
};

InflectionModule.displayName = 'InflectionModule';

export default InflectionModule;
