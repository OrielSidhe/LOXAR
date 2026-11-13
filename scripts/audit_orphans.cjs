/**
 * scripts/audit_orphans.cjs
 * ----------------------------------------------------------------------------
 * Auditoría de módulos huérfanos: archivos de `src/` sin importador entrante.
 *
 * Construye el grafo de imports relativos (`./` / `../`) de todos los archivos
 * .ts/.tsx de `src/` y lista los que nadie importa. Se excluyen del resultado
 * los puntos de entrada (main/App/index/widget) y los archivos ambient (.d.ts),
 * que son entrypoints o declaraciones de tipo sin importador por diseño.
 *
 * Uso: `node scripts/audit_orphans.cjs`
 * Exit code 0 siempre (es un reporte, no un gate); imprime el conteo al final.
 * ----------------------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const EXTS = new Set(['.ts', '.tsx']);

/** Directorios cuyos archivos se excluyen del reporte. */
const SKIP_DIRS = new Set(['__tests__']);
/** Extensión de los archivos de test (se excluyen junto con `__tests__/`). */
const TEST_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

/** Archivos que no se reportan aunque no tengan importador. */
const ENTRY_STEMS = new Set(['main', 'index', 'widget', 'App']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, files);
    } else if (EXTS.has(path.extname(entry.name))) {
      if (TEST_RE.test(entry.name)) continue;
      files.push(full);
    }
  }
  return files;
}

/** Normaliza una ruta a identificador de módulo: sin extensión, separador `/`. */
function toModuleId(absPath) {
  const rel = path.relative(SRC_DIR, absPath).split(path.sep).join('/');
  return rel.replace(/\.(tsx?|jsx?)$/, '');
}

/** Resuelve un import relativo contra el directorio del importador. */
function resolveRelative(importerAbs, spec) {
  const base = path.resolve(path.dirname(importerAbs), spec);
  for (const candidate of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const files = walk(SRC_DIR);
const byAbs = new Map(files.map((f) => [f, toModuleId(f)]));

/** Set de identificadores de módulo que tienen al menos un importador. */
const imported = new Set();
/** Importadores directos por módulo (para reporte). */
const importers = new Map();

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  // Captura `from './x'` y `import('./x')`; ignora imports de paquetes (sin `./`).
  const re = /(?:from\s*|import\(\s*)['"](\.[^'"]+)['"]/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const resolved = resolveRelative(file, match[1]);
    if (!resolved) continue;
    const id = byAbs.get(resolved);
    if (!id) continue;
    imported.add(id);
    if (!importers.has(id)) importers.set(id, []);
    importers.get(id).push(byAbs.get(file));
  }
}

const orphans = files
  .map((f) => ({ abs: f, id: byAbs.get(f) }))
  .filter(({ id }) => !imported.has(id))
  .filter(({ id }) => {
    const stem = path.basename(id);
    // .d.ts ambient y entrypoints no se reportan.
    if (id.endsWith('.d')) return false;
    if (ENTRY_STEMS.has(stem)) return false;
    return true;
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');

console.log(`Archivos escaneados en src/: ${files.length}`);
console.log(`Huérfanos (sin importador entrante): ${orphans.length}\n`);
for (const { abs, id } of orphans) {
  const size = fs.statSync(abs).size;
  console.log(`${rel(abs)}  (${size} B)`);
}
console.log(`\nTotal huérfanos: ${orphans.length}`);
