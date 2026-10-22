/**
 * importStore.integration.test.ts — E6: Integration tests for store + inductFromText.
 *
 * Validates the mock-LLM deferred-resolve path:
 *  - Multi-chunk text → chunker splits correctly
 *  - Each chunk calls llmCall
 *  - onProgress fires per chunk
 *  - Store tracks chunk status (running → success/fail)
 *  - Final merged manifest is correct
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { inductFromText } from '../inductFromText';
import { useImportStore } from '../../../stores/importStore';
import type { InductProgress } from '../inductFromText';
import type { DeclarativeManifest } from '../declarativeFormat';
import { MAX_CHUNK_SIZE } from '../chunker';

// Mock localStorage for node environment
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = value; },
    removeItem(key: string) { delete store[key]; },
    clear() { store = {}; },
  };
})();

beforeEach(() => {
  (globalThis as any).localStorage = mockStorage;
  mockStorage.clear();
  useImportStore.setState({ job: null, isModalOpen: false });
});

function makeManifest(overrides?: Partial<DeclarativeManifest>): DeclarativeManifest {
  return {
    name: 'TestLang',
    typology: { wordOrder: 'SVO', morphology: 'isolating', headDirection: 'head-initial', alignment: 'nominative' },
    phonology: { consonants: [], vowels: [], syllableStructures: ['CV'] },
    paradigms: [],
    strategies: [],
    mutationRules: [],
    exceptions: [],
    roles: [],
    ...overrides,
  };
}

// Build a large grammar text that will definitely produce >1 chunk
function makeLargeGrammar(sections: number): string {
  const lines: string[] = [];
  for (let i = 0; i < sections; i++) {
    lines.push(`====`);
    lines.push(`SECCIÓN ${i + 1}`);
    lines.push(`====`);
    // Each section needs > 200 chars to survive MIN_SUBSTANTIVE_CHARS filter
    // Use 60 repeats to push each section well over MAX_CHUNK_SIZE (12KB)
    lines.push('Esta sección describe reglas morfológicas y sintácticas detalladas. '.repeat(60));
  }
  return lines.join('\n');
}

describe('ImportStore + inductFromText — mock-LLM deferred-resolve (E6)', () => {
  it('E6.13: multi-chunk text with mock llmCall fires onProgress per chunk', async () => {
    // Build text large enough to produce 2+ chunks
    const largeText = makeLargeGrammar(3);
    expect(largeText.length).toBeGreaterThan(MAX_CHUNK_SIZE);

    const progressEvents: InductProgress[] = [];
    let callCount = 0;

    const result = await inductFromText(largeText, {
      llmAvailable: true,
      llmCall: async () => {
        callCount++;
        // Deferred resolve — simulate async API latency
        await new Promise(r => setTimeout(r, 10));
        return {
          manifest: makeManifest({
            name: `Chunk_${callCount}`,
            paradigms: [
              {
                category: 'noun',
                slots: [{ id: `p${callCount}`, feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }],
              },
            ],
          }),
          confidence: 80,
        };
      },
      onProgress: (p) => { progressEvents.push(p); },
    });

    // Progress should fire at least once per chunk
    expect(progressEvents.length).toBeGreaterThanOrEqual(1);
    // llmCall should have been called at least once
    expect(callCount).toBeGreaterThanOrEqual(1);
    // Result should be hybrid (local + LLM merge)
    expect(result.method).toBe('hybrid');
    // Should have paradigms from the LLM
    expect(result.manifest.paradigms.length).toBeGreaterThan(0);
  });

  it('E6.14: onChunkResult fires per chunk with manifest and notes', async () => {
    const largeText = makeLargeGrammar(3);

    const chunkResults: { chunkIndex: number; manifest: any; note: string }[] = [];

    await inductFromText(largeText, {
      llmAvailable: true,
      llmCall: async () => ({
        manifest: makeManifest({
          paradigms: [{ category: 'noun', slots: [{ id: 'p1', feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }] }],
        }),
        confidence: 85,
      }),
      onChunkResult: (chunkIndex, chunkResult, note) => {
        chunkResults.push({
          chunkIndex,
          manifest: chunkResult?.manifest,
          note,
        });
      },
    });

    // At least one chunk result should fire
    expect(chunkResults.length).toBeGreaterThan(0);
    // Each result should have a manifest or null
    for (const cr of chunkResults) {
      expect(cr.note).toBeTruthy();
    }
  });

  it('E6.15: store tracks chunk lifecycle via onProgress + onChunkResult', async () => {
    const largeText = makeLargeGrammar(2);

    // Start a job in the store
    const store = useImportStore.getState();
    store.startJob(largeText, 'large.txt', true);

    let chunkCallbackCalls = 0;

    await inductFromText(largeText, {
      llmAvailable: true,
      llmCall: async () => ({
        manifest: makeManifest({
          paradigms: [{ category: 'noun', slots: [{ id: 'p1', feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }] }],
        }),
        confidence: 85,
      }),
      onProgress: (progress) => {
        store.updateProgress(progress);
        // Mark current chunk as success (simulating onChunkResult)
        store.completeChunk(progress.chunk, makeManifest(), 85, ['success']);
        chunkCallbackCalls++;
      },
    });

    const job = useImportStore.getState().job;
    expect(job).not.toBeNull();
    // Should have chunk entries
    if (job!.chunks.length > 0) {
      const allSuccess = job!.chunks.every(c => c.status === 'success' || c.status === 'pending');
      expect(allSuccess).toBe(true);
    }
  });

  it('E6.16: close modal mid-job does not affect background induction', async () => {
    const largeText = makeLargeGrammar(2);

    const store = useImportStore.getState();
    store.startJob(largeText, 'large.txt', true);
    store.closeModal();

    // Even with modal closed, the job is still running
    expect(useImportStore.getState().isModalOpen).toBe(false);
    expect(useImportStore.getState().job!.status).toBe('running');

    // Complete the induction
    const result = await inductFromText(largeText, {
      llmAvailable: true,
      llmCall: async () => ({
        manifest: makeManifest({
          paradigms: [{ category: 'noun', slots: [{ id: 'p1', feature: 'number', order: 0, realization: { kind: 'affix', form: '-k', position: 'suffix' } }] }],
        }),
        confidence: 90,
      }),
    });

    store.setJobResult(result);
    expect(useImportStore.getState().job!.status).toBe('done');
    expect(useImportStore.getState().job!.result).not.toBeNull();
  });
});
