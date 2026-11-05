# SQLite Migration Guide – Preventing Data Corruption

## 1. Overview
This document describes the proper approach for integrating the `tauri-plugin-sql` backend into the **Lexicon Manager** frontend. It also records the root cause of the data corruption that occurred during the migration of commit `2969057`, and the specific safeguards we have added to prevent recurrence.

---

## 2. Root Cause Analysis

### 2.1 What Happened?
1. **Commit `2969057`** attempted to hard‑code a large JSON payload (`LexiconData`) directly into `src/App.tsx`.  
2. The payload used **escaped backslashes** (`\\n`, `\\\\`) to keep the JSON string valid in the JavaScript file.  
3. To “clean” these escapes, we ran **custom normalization scripts** (`tmp_normalize_app.py`, `sanitize_app.py`).  
   - The scripts mistakenly turned some escaped sequences into the **null byte `\x00`** and later back into `\\n`.  
   - This produced **illegal escape sequences** inside the JSX source file and introduced **null characters**, causing the file to be syntactically invalid.
4. When the corrupted file was later committed, Git recorded the broken markup, and the Vite dev server threw `JSX.Element 'main' has no closing tag` errors, breaking the dev server entirely.

### 2.2 Why Was This Not Caught Earlier?
- **No validation step** existed for escape sequences inside JS/TS files.  
- The **normalization scripts were run ad‑hoc** without a full understanding of the target encoding rules.  
- **Commit review was skipped**; reviewers looked only at the diff for logic changes, not at the raw character encoding.
- **Automated CI** only ran `npx tsc --noEmit`, which passed because the TypeScript compiler treats backslashes as Unicode escape sequences and does not flag them for JSX contexts.

### 2.3 Negligence / Bad Practices
| Bad practice | Why it mattered |
|------------|-----------------|
| Storing binary‑large blobs (JSON) inside source code as literal strings | Leads to extremely long lines and escaped characters that are error‑prone. |
| Manual string replacement without understanding escaping rules | Produced illegal sequences (`\x00`, multiple `\\`) that break JSX syntax. |
| No pre‑commit validation for JSX/TS character sets | Corrupted files can be merged silently. |
| Mixing Rust (`src-tauri`) and JS/TS changes without independent validation | Changes in one layer can hide syntax errors in the other layer. |
| Relying on visual diff only when reviewing code | Formatting quirks or invisible bytes are invisible to the eye. |

---

## 3. Guiding Principles

1. **Never embed raw JSON or large data blobs directly inside JSX/TS source.**  
   - Use **import statements** (`import dbSchema from './schema.json';`) or **fetch** the data asynchronously.
   - If you must embed a tiny snippet, use `JSON.stringify()` in a dedicated module.

2. **Validate every file with a dedicated sanitizer before committing.**  
   - The sanitizer must **only allow** JavaScript/JSX Unicode escape sequences that are valid in **ECMA‑262** and **JSX** contexts.  
   - Disallow raw `\x00`, multi‑byte `\x..` that do not map to a printable character.

3. **Enforce a pre‑commit hook** (e.g., with `husky` or a custom npm script) that runs the following checks:  
   - `npm run lint` – linting with `eslint` (ensure no stray `\n` escapes).  
   - `npm run check:esc` – validation script that rejects lines containing `\\[A-Za-z0-9]+` where the next character should be an escape but is not.  
   - `npm run build` (or `npm run typecheck`) – fails early if the build produces a syntax error.

4. **Separate concerns cleanly:**  
   - **Backend (`src-tauri`)**: Only modify Rust and configuration files.  
   - **Frontend (`src`)**: Only touch JSX/TSX files.  
   - Keep changes in each layer isolated and reviewable.

5. **Documentation in code:**  
   - For any stored data schema, create a **type‑safe TypeScript interface** in a `.d.ts` file and export it from a `.ts` module rather than embedding JSON literals.

---

## 4. Recommended Migration Steps (Clean)

```bash
# 1. Reset to a known‑good base (pre‑migration state)
git reset --hard 3dda179

# 2. Create a dedicated migration branch
git checkout -b feature/sql-migration

# 3. Enable the plugin in Cargo.toml
npm set-script cargo-add \
  tauri-plugin-sql@"^2" --features sqlite

# 4. Update src-tauri/capabilities/default.json
#   Add "sql:default" under the `all` array

# 5. Implement DB commands in src-tauri/src/lib.rs
#    (use `tauri::plugin::sql::SQL` to expose read/write functions)

# 6. In Rust, import and register the plugin via `tauri::api::sql`
#    (no changes needed in JS/TS source files yet)

# 7. In TypeScript, replace the hard‑coded JSON payload with a async fetch
import { loadLexicon, saveLexicon } from '../tauri-sql-commands';

# 8. Add a thin wrapper in `hooks/useLexicon.ts`
import { useLexicon } from '@/hooks/useLexicon';
#   const { data: lexicon } = await useLexicon();
#   // use lexicon as before

# 9. Add a validation guard for generated JSX files
#   Create scripts/validate_escapes.js
#   Run it before each commit (`git commit` hook).

# 10. Write CI checks:
#   npm run lint
#   npm run typecheck
#   npm run check:esc

# 11. Commit granular steps so reviewers can see exactly what was changed.
git add .
git commit -m "feat(backend): enable tauri-plugin-sql with SQLite"
git commit -m "feat: hook lexicon store into SQLite"
git commit -m "chore: add validation guard for JSX escapes"
```

---

## 5. Updating Contribution Documentation

### `CONTRIBUTING.md` Updates
- **Add a “Data Corruption Prevention” checklist** that includes:
  1. Run `npm run check:esc` locally.
  2. Ensure no `\x00` or stray `\\` appear in new/modified JSX/TS files.
  3. Verify that any JSON embedded in source is minified and escaped correctly.
- **Link to `SQL-MIGRATION-GUIDE.md`** for full migration instructions.
- **Add a “Pre‑Commit Validation” section** explaining the purpose of the hook.
- **Explain code‑review requirements**: any changes affecting `CAPABILITIES` or `Cargo.toml` must be accompanied by a TypeScript/JSX diff review.

### New File `SQL-MIGRATION-GUIDE.md`
- Already added above with the full migration process, root‑cause analysis, and safeguards.
- Commit this file in the same migration branch before opening a PR.

---

## 6. Test Plan After Migration

| Test | Command | Expected Outcome |
|------|---------|------------------|
| **App launches** | `npm run dev` | No syntax errors; UI loads in the browser. |
| **SQLite query works** | `npm run test:sql` (custom script that runs a simple SELECT) | Returns empty result or mock data without panics. |
| **Type checking** | `npm run typecheck` | Passes, no TS errors. |
| **ESLint** | `npm run lint` | No warnings about illegal escapes. |
| **End‑to‑end sanity** | Open `http://localhost:5173`, create a lexicon, export it | Data persists, export file contains expected entries, no early termination. |

---

## 7. Conclusion
By **restricting raw blob inclusion**, **automatically validating escape sequences**, and **documenting every step**, we eliminate the class of silent corruption that previously crippled the dev server. Future contributions will be safe, auditable, and easily reviewed.

--- 

*Prepared by the development team – 2026‑07‑10*