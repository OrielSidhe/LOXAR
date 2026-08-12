# Strategy Friendly Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the user-friendliness of Morphosyntactic Strategy names in the Grammar tab by adding clearer display names and descriptions, making it easier for conlangers to understand what each strategy does.

**Architecture:** Modify the marking strategies data structure to include user-friendly labels and enhance tooltips/InfoHints in the UI components that display strategies (GrammarTab, GrammarManagerModal). The underlying engine IDs remain unchanged to maintain compatibility.

**Tech Stack:** TypeScript, React, LOXAR codebase

---

### Task 1: Examine current marking strategies data

**Files:**
- Read: `src/data/markingStrategies.ts`

- [ ] **Step 1:1: Review MARKING_STRATEGY_LEGEND structure**
  - Look at current entries and their descriptions
  - Identify which names are not user-friendly

- [ ] **Step 1:2: Determine needed improvements**
  - Decide on approach: add `displayName` field, improve descriptions, or create separate mapping

**Files:**
- Modify: `src/data/markingStrategies.ts`

- [ ] **Step 1:3: Implement friendly names**
  - Add `displayName` property to each strategy entry with clearer, more descriptive labels
  - Optionally enhance existing descriptions if needed
  - Ensure backward compatibility (don't break existing ID usage)

**Test:** Run `npm run typecheck` to ensure no type errors

**Commit:** `feat(grammar): add displayName to marking strategies for better UX`

---

### Task 2: Update UI components to use friendly names

**Files:**
- Modify: `src/components/GrammarTab.tsx` (renderStrategies function)
- Modify: `src/components/GrammarManagerModal.tsx` (if applicable)

- [ ] **Step 2:1: Update strategy dropdowns/selects**
  - Modify the rendering logic to use `displayName` when available, fallback to original name or description
  - Ensure tooltips/InfoHints still work correctly

- [ ] **Step 2:2: Verify InfoHint usage**
  - Check if any InfoHint components reference strategies and update if needed

**Test:** Run `npm run typecheck` and optionally `npm run lint`

**Commit:** `feat(grammar): use friendly strategy names in UI dropdowns`

---

### Task 3: Validate changes

**Files:**
- Test: Manual verification or existing test suite

- [ ] **Step 3:1: Run typecheck**
  - Ensure `npm run typecheck` passes with 0 new errors

- [ ] **Step 3:2: Run lint**
  - Ensure `npm run lint` passes

- [ ] **Step 3.3: Smoke test**
  - If possible, run `npm run tauri:dev` briefly to verify UI renders correctly and strategy names appear user-friendly
  - Note: This step may be user-driven due to environment constraints

**Commit:** `test(grammar): verify strategy friendly names implementation`

---

## Summary

By adding user-friendly display names to the morphosyntactic strategies and updating UI components to use them, conlangers will have a clearer understanding of what each strategy does when configuring grammar rules. The changes are backward-compatible as internal IDs remain unchanged.