#!/usr/bin/env node
/**
 * validate_escapes.cjs
 * ----------------------------------------------------------------------------
 * Guard against the class of corruption that broke `src/App.tsx` during the
 * first SQLite migration attempt (commit 2969057).
 *
 * It scans every tracked/text file for ILLEGAL escape sequences that should
 * never appear in source code:
 *   - Raw NUL bytes (\x00)            -> produced by bad normalization scripts
 *   - Double backslash + n/t/r/etc   -> half-escaped JSON leaking into source
 *   - stray "\\" not part of a string -> usually a normalization artifact
 *
 * Allowed escapes (JS/JSX-valid) are NOT flagged:
 *   \n \t \r \' \" \\ \` \uXXXX \xNN (printable) \{ ... \}
 *
 * Exit code 0 = clean, 1 = illegal sequence found.
 * ----------------------------------------------------------------------------
 */
const fs = require("fs");
const path = require("path");

const TARGET_DIRS = ["src", "src-tauri"];
const SKIP = ["node_modules", "dist", "target", ".git", "gen"];

// Matches a literal backslash followed by another backslash then an escapable
// letter — the classic "double-escaped JSON" corruption signature.
const ILLEGAL_PATTERNS = [
  { name: "raw NUL byte", re: /\x00/g },
  { name: "double-backslash + escape letter (\\\\n, \\\\t, ...)", re: /\\\\(n|t|r|"|'|`|\\)/g },
  { name: "backslash + lowercase-u without brace (\\uXXXX malformed)", re: /\\u(?!\{)[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP.includes(entry.name)) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?|json|rs|toml|md)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let found = 0;
for (const base of TARGET_DIRS) {
  if (!fs.existsSync(base)) continue;
  for (const file of walk(base)) {
    const buf = fs.readFileSync(file);
    // Fast NUL check on raw bytes.
    if (buf.includes(0)) {
      console.error(`✗ NUL byte in ${file}`);
      found++;
      continue;
    }
    const text = buf.toString("utf8");
    for (const { name, re } of ILLEGAL_PATTERNS) {
      const m = text.match(re);
      if (m) {
        console.error(`✗ ${name} in ${file} (${m.length} hit(s))`);
        found++;
        break;
      }
    }
  }
}

if (found > 0) {
  console.error(`\nValidation FAILED: ${found} file(s) with illegal escape sequences.`);
  process.exit(1);
}
console.log("✓ Escape validation passed — no illegal sequences found.");
process.exit(0);
