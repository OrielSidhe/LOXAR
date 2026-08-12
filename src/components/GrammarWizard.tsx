import { useEffect, useState } from 'react';
import type { GrammarManifest } from '../types';
import { LANGUAGE_PROFILES, buildGrammarManifest, type LanguageProfile } from '../data/languageProfiles';
import FloatingModal from './FloatingModal';

interface GrammarWizardProps {
  open: boolean;
  initialName?: string;
  onApply: (m: GrammarManifest) => void;
  onClose: () => void;
}

const STEP_LABELS = ['Elegir perfil', 'Nombre', 'Revisar'];

const TYPOLOGY_HELP: Record<string, string> = {
  wordOrder: 'Orden de palabras: quién va antes (Sujeto-Verbo-Objeto, por ejemplo).',
  alignment: 'Alineamiento: cómo se marcan el que hace y el que recibe la acción.',
  morphology: 'Morfología: cómo se juntan los trocitos de significado en una palabra.',
  headDirection: 'Dirección del núcleo: si los modificadores van antes o después de la palabra clave.',
};

const TYPOLOGY_FIELD_LABEL: Record<string, string> = {
  wordOrder: 'Orden',
  alignment: 'Alineamiento',
  morphology: 'Morfología',
  headDirection: 'Dirección del núcleo',
};

export default function GrammarWizard({ open, initialName, onApply, onClose }: GrammarWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState<string>(initialName ?? '');

  // Reset to a clean state every time the wizard is (re)opened.
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedId(null);
      setName(initialName ?? '');
    }
  }, [open, initialName]);

  if (!open) return null;

  const selectedProfile: LanguageProfile | undefined = LANGUAGE_PROFILES.find((p) => p.id === selectedId);

  const canAdvance = step === 1 ? !!selectedProfile : true;

  const handleNext = () => {
    if (step < 3 && canAdvance) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = () => {
    if (!selectedProfile) return;
    onApply(buildGrammarManifest(selectedProfile, name.trim()));
    onClose();
  };

  return (
    <FloatingModal open={open} title="Asistente de gramática" onClose={onClose}>
      <div className="p-5">
        <p className="text-xs text-text-secondary mb-4">
          Elige un tipo de idioma y LOXAR rellena una gramática de arranque que puedes editar.
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-3">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-primary text-white border-primary'
                      : done
                        ? 'bg-primary/20 text-primary border-primary/40'
                        : 'bg-surface text-text-secondary border-border-dark'
                  }`}
                >
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs ${active ? 'text-white font-semibold' : 'text-text-secondary'}`}>{label}</span>
                {n < STEP_LABELS.length && <span className="w-6 h-px bg-border-dark" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="space-y-4">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LANGUAGE_PROFILES.map((profile) => {
                const selected = profile.id === selectedId;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedId(profile.id)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      selected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                        : 'border-border-dark bg-surface hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">{profile.label}</h3>
                      {selected && <span className="text-primary text-sm">✓</span>}
                    </div>
                    <p className="text-xs text-text-secondary mt-2 leading-relaxed">{profile.description}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {profile.showTone && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent">tonal</span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-secondary">
                        {profile.typology.morphology}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-secondary">
                        {profile.typology.wordOrder}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && selectedProfile && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">Nombre de tu idioma</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Mipalabra"
                  className="w-full bg-surface border border-border-dark rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                />
              </div>
              <div className="bg-surface rounded-xl p-4 border border-border-dark">
                <h3 className="text-sm font-bold text-white mb-3">Tu perfil elegido: {selectedProfile.label}</h3>
                <dl className="space-y-2">
                  {(Object.keys(TYPOLOGY_FIELD_LABEL) as (keyof LanguageProfile['typology'])[]).map((key) => (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <dt className="text-sm text-text-secondary">{TYPOLOGY_FIELD_LABEL[key]}</dt>
                      <dd className="text-sm text-white font-semibold text-right">
                        {selectedProfile.typology[key]}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs text-text-secondary mt-3 leading-relaxed">
                  {TYPOLOGY_HELP.wordOrder} {TYPOLOGY_HELP.morphology} Podrás cambiar todo esto después en la pestaña Tipología.
                </p>
              </div>
            </div>
          )}

          {step === 3 && selectedProfile && (
            <div className="space-y-4">
              <div className="bg-surface rounded-xl p-4 border border-border-dark space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Perfil</span>
                  <span className="text-sm text-white font-bold">{selectedProfile.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Nombre</span>
                  <span className="text-sm text-white">{name.trim() || '(sin nombre)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Tipología</span>
                  <span className="text-sm text-white">
                    {selectedProfile.typology.wordOrder} · {selectedProfile.typology.morphology}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Inventario fonológico</span>
                  <span className="text-sm text-white">
                    {selectedProfile.phonology
                      ? `${selectedProfile.phonology.inventory.consonants.length} consonantes / ${selectedProfile.phonology.inventory.vowels.length} vocales`
                      : 'se omitirá'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Paradigmas de inflexión</span>
                  <span className="text-sm text-white">{selectedProfile.paradigms.length} categoría(s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Reglas de mutación/tono</span>
                  <span className="text-sm text-white">{selectedProfile.mutationRules.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-secondary">Tonos</span>
                  <span className="text-sm text-white">{selectedProfile.showTone ? 'sí (se mostrará el área de tono)' : 'no'}</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Al crear, LOXAR guardará esta gramática de arranque. Luego podrás editar cada sección en la pestaña
                Gramática. Nada se pierde: siempre puedes volver a abrir el asistente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border-dark">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-surface border border-border-dark text-white hover:bg-white/5 transition-colors"
              >
                Atrás
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  canAdvance
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-surface text-text-secondary cursor-not-allowed opacity-50'
                }`}
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-white shadow-accent/20 hover:bg-accent-hover transition-colors"
              >
                Crear gramática
              </button>
            )}
          </div>
        </div>
      </div>
    </FloatingModal>
  );
}
