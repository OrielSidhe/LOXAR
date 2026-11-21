# GAUNTLET v3.14 — LEXICOM: EXPORT REAL + COMPARACIÓN DE LÉXICOS + EXTRACCIÓN FONO-MORFOLÓGICA

Auditoría externa 2026-11-20. Ejecución por fases, cada una cerrando en
commit + push + CI VERDE con número de run.

## FILOSOFÍA DEL PROYECTO (decisión del dueño, NO negociable)

El eje de creación es **LÉXICO + GRAMÁTICA PRIMERO**. La fonología y la
morfología NO son pasos iniciales: se **EXTRAEN** (inferidas) del léxico y
la gramática existentes, se presentan como reglas **EDITABLES** (el
conlanguer las corrige, aumenta, borra), y el asistente inicial ya no exige
definirlas antes de tener datos.

## PRECONDICIONES (FASE 0, paso 1)

- `git status --porcelain` → **limpio** (verificado en HEAD `d0e5741`).
  Nota: al arrancar la auditoría el árbol estaba sucio (WIP de CLN:
  `src/App.tsx`, `src/components/LanguageHomeCanvas.tsx`,
  `src/utils/dashboardStats.ts`); un proceso paralelo lo commiteó
  (`d0e5741 docs: checkpoint CLN de buildDashboardStats`) antes de tocar nada.
- HEAD real: **`d0e5741`** (`docs: checkpoint CLN de buildDashboardStats (P1 God Component)`).
- `origin/master` está **48 commits atrás** (rama local adelantada, sin pushear).
  El push de esta fase publicará esos 48 commits + el de la fase.
- **DISCREPANCIA CON EL AUDITOR**: el auditor cita HEAD `7ce42da`. Ese commit
  existe pero está muy por detrás; los hallazgos H1–H4 los **verifiqué yo
  mismo sobre `d0e5741`** (lectura de archivo completo), no sobre `7ce42da`.
- CI: `.github/workflows/ci.yml` → `npm ci`, `npm run typecheck`,
  `npm run lint` (= `scripts/validate_escapes.cjs`), `npx vitest run`,
  `npm run tauri:build`. No hay script `test` en package.json; los tests se
  corren con `npx vitest run`.
- Graft: `graft/` presente y gitignoreado; ejecuté `npx @nanonets/graft build`
  (1860 nodos, 3855 aristas) para sincronizar.

## HALLAZGOS VERIFICADOS (por mí, sobre d0e5741)

- **H1 — CONFIRMADO.** `src/components/SettingsModal.tsx:283` lista
  `['json','csv','md','xlsx','docx']`; `DEFAULTS.exportFormats = ['json','csv','md']`
  (línea 60).
- **H2 — CONFIRMADO.** `handleSave()` (líneas 123–133) persiste solo
  `themeId, soundsEnabled, tourCompleted, showWelcomeOnStart, exportPath`;
  el `useEffect` de carga (88–98) no lee `exportFormats`. Los toggles son
  decorativos. **Agravante no listado por el auditor:** `saveSessionCache()`
  escribe el objeto tal cual (no fusiona, `src/services/sessionCache.ts:69`),
  así que `handleSave` **sobrescribe y pierde** `activeTab`, `projectPath`,
  `activeProfile` y demás campos del cache. Corregir H2 debe fusionar, no
  volver a escribir un objeto parcial.
- **H3 — CONFIRMADO PARCIALMENTE.** `FileControls.tsx:17` tipa
  `onExport: (format: 'csv' | 'json') => void` y el dropdown (113–118) está
  hardcodeado a CSV y JSON. **PERO el auditor se equivoca al decir "TXT no
  existe en ninguna parte"**: `src/hooks/useProjectOperations.ts:200` tipa
  `handleFileExport(format: 'csv' | 'json' | 'txt')` y la línea 222 genera
  contenido TXT (una entrada por línea, `Léxema (Categoría): Significado`).
  TXT existe en el pipeline pero **no está expuesto** en el dropdown ni en
  Settings. No contrastado con el auditor → lo reporto y procedo con el
  enunciado de FASE EX (implementar TXT real con cabecera).
- **H4 — CONFIRMADO, con matiz.** No hay exportador real de **md**, **xlsx**
  ni **docx** para el léxico. `xlsx`/`docx`/`mammoth` solo aparecen en
  **importación** de gramática (`src/services/grammar/fileParser.ts`) y en
  `CollectionsManager` (exportar colección a xlsx, ajeno al léxico). **`md`
  tampoco tiene exportador** (solo aparece en la lista de Settings y en el
  importador de gramática). Es decir: `md` es también una promesa incumplida,
  no solo xlsx/docx.

## AUDITORÍA DE TERRENO (solo lectura)

### a) Pipeline de exportación real

- Punto de entrada: `AppToolbar` (`src/components/AppToolbar.tsx`) →
  `App.tsx:651 onExport={handleFileExport}` → `FileControls.tsx`
  (`onExport` hardcodeado csv/json).
- `handleFileExport` (`src/hooks/useProjectOperations.ts:200-231`):
  - Requiere `exportPath` y `activeLexiconName`; si no, toast de error.
  - `json` → `JSON.stringify(activeLexicon, null, 2)`.
  - `csv` → `Papa.unparse` de `{ID, Raíz, Léxema(join ';'), Categoría,
    Significado(join ';'), externalID}` con BOM `\uFEFF`.
  - `txt` → `Léxema(join ', ') (Categoría): Significado(join ', ')` por línea,
    **sin cabecera ni fecha ni Raíz ni externalID**.
  - Escribe con `window.loxarBridge.exportFile({filePath, content})`.
- No existe rama `md`, `xlsx`, `docx`. Ningún otro módulo procesa
  `exportFormats` (grep: solo `SettingsModal.tsx`).

### b) WorkbenchTab y LexiconToolsModal

- `WorkbenchTab.tsx` (129 líneas) = `WorkQueueBar` + `EntryEditor` +
  `WorkbenchRightPanel`. **No contiene herramientas de léxico** (ni auditoría,
  ni duplicados, ni diff/merge). Recibe `activeLexicon`, `manifest`,
  `onSyncPhonology`, etc.
- `LexiconToolsModal.tsx` (acciones actuales): Taller de Escritura
  (Neography), Gestor de Categorías, Administrador de Guiones, Gestor de
  Gramática, Patio de Traducción, Generar Reporte. **No hay diff/merge.**
- `LexiconAuditPanel.tsx` es el pool de generación IA (aprobar/rechazar
  palabras generadas), **no** una auditoría de duplicados.
- Carga de léxicos: `AppToolbar onImport → lexiconHook.startImportProcess`
  (`src/hooks/useLexicon.ts:294`) → `parseFileContent` (CSV/JSON/backup) →
  mapping → `processMappedData`.
- **No existe NINGUNA función de diff/merge de léxicos** (grep de
  compare/merge/fusionar: solo fusiones de categorías/funciones, ajenas).

### c) GrammarWizard y fonología/morfología

- `GrammarWizard.tsx`: 3 pasos — **1 Elegir perfil, 2 Nombre, 3 Revisar**.
  Construye el manifiesto con `buildGrammarManifest(perfil, nombre)` desde
  `LANGUAGE_PROFILES` (`src/data/languageProfiles.ts`), que **ya incluye
  fonología y paradigmas por perfil**. No exige definir fonología/morfología
  a mano. `GrammarTab` lo auto-abre una vez cuando el manifiesto es
  "first run" (`isFirstRunManifest`).
- `FirstRunWizard.tsx`: pasos `ai → data-folder → complete`. No menciona
  fonología ni léxico.
- `GrammarPhonologyPanel.tsx` (85 líneas): inventario `consonants`/`vowels` y
  `syllableStructures` + `maxConsonantClusters`. Editable e individual.
- `GrammarMorphologyPanel.tsx` (144 líneas): `manifest.affixInventory`
  (manuales) + `lexiconAffixes` (detectados de entradas cuya `Categoría`
  contiene afijo/prefijo/sufijo/infijo, `src/utils/grammarTabModel.ts:130`
  `buildLexiconAffixes`) + `ExceptionEditor` + `RuleEditor`.
- Servicios: `src/services/grammar/phonology.ts` (`validate`),
  `src/services/grammar/phonologySync.ts` (`phonologyFromManifest`),
  `src/services/phonology/linter.ts` (`lintPhonotactics`),
  `src/services/grammar/morphology.ts` (`realizeLexeme`, motor de inflexión,
  **no** extractor). **No existe extractor fonológico ni morfológico.**

### d) Entrada de léxico y clave de duplicados

- `LexiconEntry` (`src/types.ts:2`): `ID: string`, `externalID?: string`,
  `Raíz: string`, `Léxema: string[]`, `Categoría: string`,
  `Significado: string[]`, `extraData: {[k:string]: any}`,
  `exceptions?: LexicalException[]`.
- Duplicados (`src/utils/entryEditorModel.ts`):
  - `findDuplicateLexemas` → compara `Léxema` en **lowercase + trim**.
  - `findDuplicateRaices` → compara `Raíz` en **UPPERCASE + trim**.
  - `findDuplicateSignificados` → compara `Significado`.
- **Conclusión:** no hay clave lemma+POS; la identidad práctica es el
  **léxema normalizado**. Para CMP usaré `casefold + NFC + trim` del primer
  léxema (coincide con la detección de duplicados actual, pero normalizando
  unicode). Reportado en la spec; si el dueño prefiere lemma+POS, se cambia.

## DECISIONES (registradas aquí antes de implementar)

- **D1 (xlsx/docx):** se **eliminan** de los toggles de Settings. No tienen
  exportador y no se implementan en esta versión (promesa incumplida).
- **D2 (md):** el gauntlet solo menciona xlsx/docx, pero `md` **tampoco tiene
  exportador**. La checklist de demo del propio gauntlet pide "el dropdown
  muestra MD y TXT", así que **md se implementa de verdad** (exportador MD
  real) en lugar de eliminarlo. Se reporta la decisión.
- **D3 (TXT):** ya existía un generador TXT mínimo; se sustituye por el
  exportador pedido (cabecera con nombre del léxico y fecha, una entrada por
  línea, campos claros, vacíos excluidos).
- **D4 (exportFormats):** se persiste en `sessionCache` y se fusiona con el
  cache existente (corrige también la pérdida de `activeTab`/`projectPath`).
- **D5 (clave CMP):** léxema normalizado `NFC + casefold + trim`.

## TABLA DE FASES

| Fase | Objetivo | Commit | Run CI | Estado |
|---|---|---|---|---|
| 0 | Spec + auditoría de terreno | `9047973` | — | CERRADA |
| EX | Export real TXT + dropdown unido a Settings | `919fee1` | pendiente push | CERRADA |
| CMP | Comparación y merge de léxicos | `db9587d` | pendiente push | CERRADA |
| NAV | Paso rápido Workbench ↔ Léxico | `719a33c` | pendiente push | CERRADA |
| FX | Extracción fonológica del léxico | `094eee9` | pendiente push | CERRADA |
| MY | Extracción morfológica | `a5f5c3a` | pendiente push | CERRADA |
| FLU | Léxico/gramática primero | pendiente | pendiente push | EN CURSO |
| D | Checklist demo (lo hace el usuario) | — | — | PENDIENTE |
| R | Reporte final evidence-based | — | — | PENDIENTE |

## CHECKLIST DEMO (FASE D — la ejecuta el usuario, NO yo)

- [ ] 1. Activo MD+TXT en Settings, cierro y reabro: persiste y el dropdown
      Exportar muestra exactamente MD y TXT.
- [ ] 2. Exporto TXT: abro el archivo, es legible y completo.
- [ ] 3. Cargo léxico A (1000 pal) vs archivo B (1022 pal): veo las 22 y las
      diferencias campo a campo.
- [ ] 4. Añado "todas las faltantes" y luego añado una por descarte.
- [x] 5. Salto directo Workbench→Léxico→Workbench sin pérdida de estado.
- [ ] 6. Botón "Extraer del léxico" genera fonología plausible y editable;
      corro dos veces y no duplica.
- [ ] 7. Morfología extraída muestra evidencia por regla.
- [ ] 8. Nuevo proyecto empieza por léxico, no por fonología.

Estado: **PENDIENTE — la ejecuta el usuario**.

## PENDIENTES QUE ESTE GAUNTLET NO TOCA (no ejecutar)

- Fase J de v3.12 (jobs visibles/cancelables).
- LICENSE/README.
- Gauntlet v3.13 (providers), pendiente.
- Nada de v3.15.
