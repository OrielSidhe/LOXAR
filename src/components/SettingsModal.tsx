import React, { useState, useEffect } from 'react';
import XCircleIcon from './icons/XCircleIcon';
import SettingsIcon from './icons/SettingsIcon';
import { loadSessionCache, saveSessionCache } from '../services/sessionCache';
import { applyTheme, themes, type ThemeId } from '../services/themeService';
import { audioService } from '../services/audioService';

type Settings = {
  themeId: ThemeId;
  animationsEnabled: boolean;
  soundsEnabled: boolean;
  interfaceLanguage: string;
  nativeConlangLanguage: string;
  aiProvider: 'gemini' | 'ollama' | 'offline';
  aiModel: string;
  aiTemperature: number;
  aiAutoComplete: boolean;
  aiResponseLanguage: string;
  backupFolder: string;
  autoBackupEnabled: boolean;
  autoBackupMinutes: number;
  exportFormats: string[];
  highContrast: boolean;
  density: 'comfortable' | 'compact';
  autoSave: boolean;
  confirmDelete: boolean;
  tourOnStart: boolean;
  performanceMode: boolean;
  maxTableRows: number;
  aiCacheEnabled: boolean;
  debugLogging: boolean;
  safeMode: boolean;
};

type SectionId = 'appearance' | 'ai' | 'backup' | 'behavior' | 'performance' | 'data' | 'advanced';

const SECTIONS: { id: SectionId; label: string; icon?: React.ReactNode }[] = [
  { id: 'appearance', label: 'Apariencia' },
  { id: 'ai', label: 'Inteligencia artificial' },
  { id: 'backup', label: 'Backup y exportación' },
  { id: 'behavior', label: 'Comportamiento' },
  { id: 'performance', label: 'Rendimiento' },
  { id: 'data', label: 'Datos' },
  { id: 'advanced', label: 'Avanzado' },
];

const DEFAULTS: Settings = {
  themeId: 'midnight',
  animationsEnabled: true,
  soundsEnabled: true,
  interfaceLanguage: 'es',
  nativeConlangLanguage: '',
  aiProvider: 'gemini',
  aiModel: 'gemini-2.5-flash',
  aiTemperature: 0.4,
  aiAutoComplete: true,
  aiResponseLanguage: 'same',
  backupFolder: '',
  autoBackupEnabled: true,
  autoBackupMinutes: 15,
  exportFormats: ['json', 'csv', 'md'],
  highContrast: false,
  density: 'comfortable',
  autoSave: true,
  confirmDelete: true,
  tourOnStart: false,
  performanceMode: false,
  maxTableRows: 2000,
  aiCacheEnabled: true,
  debugLogging: false,
  safeMode: false,
};

const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [section, setSection] = useState<SectionId>('appearance');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadSessionCache().then((cache) => {
      if (cancelled) return;
      setSettings((prev) => ({
        ...prev,
        themeId: (cache.themeId as ThemeId) || prev.themeId,
        soundsEnabled: cache.soundsEnabled ?? prev.soundsEnabled,
        tourOnStart: cache.tourCompleted === false ? false : prev.tourOnStart,
        backupFolder: cache.exportPath || prev.backupFolder,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if ('themeId' in patch) {
        applyTheme(next.themeId);
      }
      return next;
    });
    setSaved(false);
  };

  const toggleArray = (key: 'exportFormats', value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    await saveSessionCache({
      themeId: settings.themeId,
      soundsEnabled: settings.soundsEnabled,
      tourCompleted: !settings.tourOnStart,
      exportPath: settings.backupFolder || null,
    });
    setSaved(true);
    if (settings.soundsEnabled) audioService.playClick();
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    applyTheme(DEFAULTS.themeId);
    setSaved(false);
    if (settings.soundsEnabled) audioService.playClick();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Configuración">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-background rounded-2xl border border-border-dark shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border-dark">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-accent" />
            Configuración
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-56 border-r border-border-dark p-3 space-y-1 overflow-y-auto">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  section === item.id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </aside>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {section === 'appearance' && (
              <>
                <SectionTitle>Tema</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(themes).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => update({ themeId: theme.id })}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        settings.themeId === theme.id ? 'border-accent bg-white/5' : 'border-border-dark hover:border-white/20'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-white">{theme.label}</span>
                      <span className="block mt-1 h-3 w-16 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                    </button>
                  ))}
                </div>

                <ToggleRow label="Animaciones" value={settings.animationsEnabled} onChange={(v) => update({ animationsEnabled: v })} />
                <ToggleRow label="Sonidos" value={settings.soundsEnabled} onChange={(v) => update({ soundsEnabled: v })} />
                <ToggleRow label="Alto contraste" value={settings.highContrast} onChange={(v) => update({ highContrast: v })} />

                <SelectRow
                  label="Densidad"
                  value={settings.density}
                  onChange={(v) => update({ density: v as 'comfortable' | 'compact' })}
                  options={[
                    { value: 'comfortable', label: 'Cómoda' },
                    { value: 'compact', label: 'Compacta' },
                  ]}
                />

                <InputRow label="Idioma de interfaz" value={settings.interfaceLanguage} onChange={(v) => update({ interfaceLanguage: v })} />
                <InputRow label="Idioma nativo del conlang" value={settings.nativeConlangLanguage} onChange={(v) => update({ nativeConlangLanguage: v })} />
              </>
            )}

            {section === 'ai' && (
              <>
                <SectionTitle>Proveedor de IA</SectionTitle>
                <SelectRow
                  label="Proveedor"
                  value={settings.aiProvider}
                  onChange={(v) => update({ aiProvider: v as Settings['aiProvider'] })}
                  options={[
                    { value: 'gemini', label: 'Gemini' },
                    { value: 'ollama', label: 'Ollama' },
                    { value: 'offline', label: 'Solo offline' },
                  ]}
                />
                <InputRow label="Modelo" value={settings.aiModel} onChange={(v) => update({ aiModel: v })} />
                <NumberRow label="Temperatura" value={settings.aiTemperature} onChange={(v) => update({ aiTemperature: Number(v) })} min={0} max={1} step={0.05} />
                <ToggleRow label="Autocompletado inteligente" value={settings.aiAutoComplete} onChange={(v) => update({ aiAutoComplete: v })} />
                <ToggleRow label="Indicador de IA en UI" value={settings.aiCacheEnabled} onChange={(v) => update({ aiCacheEnabled: v })} />
                <SelectRow
                  label="Idioma de respuesta"
                  value={settings.aiResponseLanguage}
                  onChange={(v) => update({ aiResponseLanguage: v })}
                  options={[
                    { value: 'same', label: 'Mismo que la entrada' },
                    { value: 'es', label: 'Español' },
                    { value: 'en', label: 'Inglés' },
                  ]}
                />
              </>
            )}

            {section === 'backup' && (
              <>
                <SectionTitle>Backup</SectionTitle>
                <InputRow label="Carpeta de backup" value={settings.backupFolder} onChange={(v) => update({ backupFolder: v })} />
                <ToggleRow label="Auto-backup" value={settings.autoBackupEnabled} onChange={(v) => update({ autoBackupEnabled: v })} />
                <NumberRow label="Intervalo (min)" value={settings.autoBackupMinutes} onChange={(v) => update({ autoBackupMinutes: Number(v) })} min={1} max={120} step={1} />

                <SectionTitle>Exportación</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {['json', 'csv', 'md', 'xlsx', 'docx'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => toggleArray('exportFormats', fmt)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        settings.exportFormats.includes(fmt) ? 'border-accent text-accent bg-accent/10' : 'border-border-dark text-text-secondary hover:text-white'
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-secondary">Formatos activos para exportar léxico, gramática o fuentes.</p>
              </>
            )}

            {section === 'behavior' && (
              <>
                <SectionTitle>Comportamiento</SectionTitle>
                <ToggleRow label="Auto-guardado" value={settings.autoSave} onChange={(v) => update({ autoSave: v })} />
                <ToggleRow label="Confirmar eliminaciones" value={settings.confirmDelete} onChange={(v) => update({ confirmDelete: v })} />
                <ToggleRow label="Tour automático al iniciar" value={settings.tourOnStart} onChange={(v) => update({ tourOnStart: v })} />
                <ToggleRow label="Guías interactivas" value={settings.aiAutoComplete} onChange={(v) => update({ aiAutoComplete: v })} />
                <SelectRow
                  label="Modo de interfaz"
                  value={settings.density}
                  onChange={(v) => update({ density: v as 'comfortable' | 'compact' })}
                  options={[
                    { value: 'comfortable', label: 'Estándar' },
                    { value: 'compact', label: 'Enfoque' },
                  ]}
                />
              </>
            )}

            {section === 'performance' && (
              <>
                <SectionTitle>Rendimiento</SectionTitle>
                <ToggleRow label="Modo performance" value={settings.performanceMode} onChange={(v) => update({ performanceMode: v })} />
                <NumberRow label="Filas visibles máximas" value={settings.maxTableRows} onChange={(v) => update({ maxTableRows: Number(v) })} min={200} max={10000} step={100} />
                <ToggleRow label="Caché de respuestas de IA" value={settings.aiCacheEnabled} onChange={(v) => update({ aiCacheEnabled: v })} />
              </>
            )}

            {section === 'data' && (
              <>
                <SectionTitle>Datos</SectionTitle>
                <InputRow label="Ruta de base de datos" value={settings.backupFolder} onChange={(v) => update({ backupFolder: v })} />
                <p className="text-xs text-text-secondary">Compactación de SQLite y limpieza de caché están disponibles desde la sección Avanzado.</p>
              </>
            )}

            {section === 'advanced' && (
              <>
                <SectionTitle>Avanzado</SectionTitle>
                <ToggleRow label="Logs de debug visibles" value={settings.debugLogging} onChange={(v) => update({ debugLogging: v })} />
                <ToggleRow label="Modo seguro (sin envíos externos)" value={settings.safeMode} onChange={(v) => update({ safeMode: v })} />
                <button
                  onClick={() => {
                    if (settings.soundsEnabled) audioService.playClick();
                    alert('Acción simulada: verificar integridad de la BD.');
                  }}
                  className="px-3 py-2 bg-background border border-subtle rounded-lg text-sm hover:border-accent/40 transition-colors"
                >
                  Verificar integridad de la BD
                </button>
                <button
                  onClick={() => {
                    if (settings.soundsEnabled) audioService.playClick();
                    alert('Acción simulada: compactar SQLite.');
                  }}
                  className="px-3 py-2 bg-background border border-subtle rounded-lg text-sm hover:border-accent/40 transition-colors"
                >
                  Compactar base de datos
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="px-4 py-2 bg-accent text-white rounded-lg font-bold hover:brightness-110 active:scale-[0.98] transition-all">
              Guardar
            </button>
            <button onClick={handleReset} className="px-4 py-2 bg-background border border-subtle rounded-lg text-sm hover:border-accent/40 transition-colors">
              Restablecer
            </button>
            <span className={`text-xs ${saved ? 'text-success' : 'text-text-secondary'}`}>{saved ? 'Guardado' : 'Sin cambios'}</span>
          </div>
          <button onClick={onClose} className="text-sm text-text-secondary hover:text-white transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">{children}</h3>
);

const ToggleRow: React.FC<{ label: string; value: boolean; onChange: (value: boolean) => void }> = ({ label, value, onChange }) => (
  <label className="flex items-center justify-between">
    <span className="text-sm text-text-primary">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`h-8 w-14 rounded-full border transition-colors ${value ? 'bg-accent border-accent' : 'border-border-dark bg-background'}`}
      aria-pressed={value}
    >
      <span className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  </label>
);

const InputRow: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <label className="block space-y-1">
    <span className="text-sm text-text-secondary">{label}</span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
    />
  </label>
);

const NumberRow: React.FC<{ label: string; value: number; onChange: (value: string) => void; min: number; max: number; step: number }> = ({ label, value, onChange, min, max, step }) => (
  <label className="block space-y-1">
    <span className="text-sm text-text-secondary">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
    />
  </label>
);

const SelectRow: React.FC<{ label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }> = ({ label, value, onChange, options }) => (
  <label className="block space-y-1">
    <span className="text-sm text-text-secondary">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-subtle rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </label>
);

export default SettingsModal;
