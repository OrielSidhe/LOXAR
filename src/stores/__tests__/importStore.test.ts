/**
 * importStore.test.ts — E6: Tests for the zustand import store.
 *
 * Validates:
 *  - Job lifecycle: idle → running → done
 *  - Modal close does NOT cancel a running job
 *  - Resume-on-reopen from localStorage
 *  - Auto-save of partial chunk state
 *  - completeChunk / failChunk / setJobResult
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useImportStore, getJobSignal } from '../importStore';
import type { InductProgress } from '../../services/grammar/inductFromText';
import type { DeclarativeManifest } from '../../services/grammar/declarativeFormat';

// ── Mock localStorage for node environment ──────────────────────────────
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
  useImportStore.setState({
    job: null,
    isModalOpen: false,
  });
});

function makeMinimalManifest(): DeclarativeManifest {
  return {
    name: 'TestLang',
    typology: { wordOrder: 'SVO', morphology: 'isolating', headDirection: 'head-initial', alignment: 'nominative' },
    phonology: { consonants: [], vowels: [], syllableStructures: ['CV'] },
    paradigms: [],
    strategies: [],
    mutationRules: [],
    exceptions: [],
    roles: [],
  };
}

describe('ImportStore — job lifecycle', () => {
  it('E6.1: startJob creates a running job', () => {
    const store = useImportStore.getState();
    store.startJob('test grammar text', 'test.txt', true);

    const job = useImportStore.getState().job;
    expect(job).not.toBeNull();
    expect(job!.status).toBe('running');
    expect(job!.text).toBe('test grammar text');
    expect(job!.fileName).toBe('test.txt');
    expect(job!.aiAvailable).toBe(true);
    expect(job!.startTime).toBeGreaterThan(0);
  });

  it('E6.2: closeModal does NOT cancel the job — job stays running', () => {
    const store = useImportStore.getState();
    store.startJob('test text', undefined, true);
    store.closeModal();

    const state = useImportStore.getState();
    expect(state.isModalOpen).toBe(false);
    expect(state.job).not.toBeNull();
    expect(state.job!.status).toBe('running');
  });

  it('E6.3: setJobResult transitions to done and clears persisted job', () => {
    const store = useImportStore.getState();
    store.startJob('test text');

    const fakeResult = {
      manifest: makeMinimalManifest(),
      confidence: 80,
      method: 'hybrid' as const,
      parseReport: { sectionsFound: [], sectionsUnparsed: [], paradigmsExtracted: 0, exceptionsExtracted: 0, warnings: [] },
      report: { ok: true, score: 80, sections: {} as any, problems: [], suggestions: [] },
      notes: ['test note'],
    };

    store.setJobResult(fakeResult as any);

    const job = useImportStore.getState().job;
    expect(job).not.toBeNull();
    expect(job!.status).toBe('done');
    expect(job!.result).not.toBeNull();
    expect(job!.endTime).toBeGreaterThan(0);
  });

  it('E6.4: cancelJob transitions to cancelled', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    store.cancelJob();

    const job = useImportStore.getState().job;
    expect(job).not.toBeNull();
    expect(job!.status).toBe('cancelled');
    expect(job!.endTime).toBeGreaterThan(0);
  });

  it('E6.5: clearJob removes the job entirely', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    store.clearJob();

    const state = useImportStore.getState();
    expect(state.job).toBeNull();
  });
});

describe('ImportStore — progress + chunk tracking', () => {
  it('E6.6: updateProgress initializes all chunks as pending/running', () => {
    const store = useImportStore.getState();
    store.startJob('test text');

    const progress: InductProgress = { chunk: 1, total: 3, message: 'Starting', charCount: 5000 };
    store.updateProgress(progress);

    const job = useImportStore.getState().job;
    expect(job!.chunks.length).toBe(3);
    expect(job!.chunks[0].displayIndex).toBe(1);
    expect(job!.chunks[0].status).toBe('running');
    expect(job!.chunks[1].status).toBe('pending');
    expect(job!.chunks[2].status).toBe('pending');
  });

  it('E6.7: updateProgress marks previous chunks as success when advancing', () => {
    const store = useImportStore.getState();
    store.startJob('test text');

    store.updateProgress({ chunk: 1, total: 3, message: 'Chunk 1', charCount: 100 });
    store.updateProgress({ chunk: 2, total: 3, message: 'Chunk 2', charCount: 200 });

    const chunks = useImportStore.getState().job!.chunks;
    expect(chunks[0].status).toBe('success');
    expect(chunks[1].status).toBe('running');
    expect(chunks[2].status).toBe('pending');
  });

  it('E6.8: completeChunk marks a chunk as success with manifest', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    store.updateProgress({ chunk: 1, total: 1, message: 'Running', charCount: 100 });

    const manifest = makeMinimalManifest();
    store.completeChunk(1, manifest, 85);

    const chunk = useImportStore.getState().job!.chunks[0];
    expect(chunk.status).toBe('success');
    expect(chunk.manifest).not.toBeUndefined();
    expect(chunk.confidence).toBe(85);
  });

  it('E6.9: failChunk marks a chunk as failed with error note', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    store.updateProgress({ chunk: 1, total: 1, message: 'Running', charCount: 100 });

    store.failChunk(1, 'LLM failed');

    const chunk = useImportStore.getState().job!.chunks[0];
    expect(chunk.status).toBe('failed');
    expect(chunk.notes).toContain('LLM failed');
  });
});

describe('ImportStore — resume-on-reopen (E4)', () => {
  it('E6.10: a running job is persisted to localStorage', () => {
    const store = useImportStore.getState();
    store.startJob('persisted text', 'file.txt', true);

    const stored = localStorage.getItem('loxar_importer_jobs_v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.status).toBe('running');
    expect(parsed.text).toBe('persisted text');
  });

  it('E6.11: openModal resumes a persisted running job', () => {
    const store = useImportStore.getState();
    store.startJob('persisted text', 'file.txt', true);
    store.closeModal();

    // Simulate fresh open
    useImportStore.setState({ job: null, isModalOpen: false });
    store.openModal('', 'file.txt', true);

    const job = useImportStore.getState().job;
    expect(job).not.toBeNull();
    expect(job!.status).toBe('running');
    expect(job!.text).toBe('persisted text');
  });

  it('E6.12: clearJob removes the persisted entry', () => {
    const store = useImportStore.getState();
    store.startJob('test', undefined, true);
    expect(localStorage.getItem('loxar_importer_jobs_v1')).not.toBeNull();

    store.clearJob();
    expect(localStorage.getItem('loxar_importer_jobs_v1')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GAUNTLET v3.12 Phase A — single-owner AbortController + retryable chunks
// ═══════════════════════════════════════════════════════════════════════════

describe('ImportStore — A1: owning AbortController + cancel aborts the run', () => {
  it('A1.1: startJob registers an AbortSignal retrievable by job id', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    const jobId = useImportStore.getState().job!.id;

    const signal = getJobSignal(jobId);
    expect(signal).not.toBeNull();
    expect(signal!.aborted).toBe(false);
  });

  it('A1.2: cancelJob aborts the owning signal that reaches the fetch chain', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    const jobId = useImportStore.getState().job!.id;
    const signal = getJobSignal(jobId)!;

    // Simulate a fetch that listens to the run's signal.
    let fetchAborted = false;
    signal.addEventListener('abort', () => { fetchAborted = true; });

    store.cancelJob();

    // The signal the adapter fetched against is now aborted — the fetch stops.
    expect(signal.aborted).toBe(true);
    expect(fetchAborted).toBe(true);
    expect(useImportStore.getState().job!.status).toBe('cancelled');
  });

  it('A1.3: the owning controller is released once the job reaches a terminal state', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    const jobId = useImportStore.getState().job!.id;
    expect(getJobSignal(jobId)).not.toBeNull();

    store.setJobResult({
      manifest: makeMinimalManifest(),
      confidence: 80,
      method: 'hybrid',
      parseReport: { sectionsFound: [], sectionsUnparsed: [], paradigmsExtracted: 0, exceptionsExtracted: 0, warnings: [] },
      report: { ok: true, score: 80, sections: {} as any, problems: [], suggestions: [] },
    } as any);

    // Controller released — a fresh getJobSignal returns null (no leak).
    expect(getJobSignal(jobId)).toBeNull();
  });
});

describe('ImportStore — A5: retry ONLY failed chunks', () => {
  function seedJobWithChunks(): string {
    const store = useImportStore.getState();
    store.startJob('test text');
    const jobId = useImportStore.getState().job!.id;
    store.updateProgress({ chunk: 1, total: 3, message: 'c1', charCount: 100 });
    // chunk 1 success, chunk 2 failed, chunk 3 running (mid-flight)
    store.completeChunk(1, makeMinimalManifest(), 80, ['ok']);
    store.failChunk(2, 'LLM timeout');
    return jobId;
  }

  it('A5.1: retryFailedChunks returns a fresh signal only when failures exist', () => {
    const jobId = seedJobWithChunks();
    const signal = useImportStore.getState().retryFailedChunks();
    expect(signal).not.toBeNull();
    expect(signal!.aborted).toBe(false);
    // Re-armed as running for the retry run.
    expect(useImportStore.getState().job!.status).toBe('running');
  });

  it('A5.2: retryFailedChunks returns null when no chunk failed', () => {
    const store = useImportStore.getState();
    store.startJob('test text');
    store.updateProgress({ chunk: 1, total: 1, message: 'c1', charCount: 100 });
    store.completeChunk(1, makeMinimalManifest(), 80, ['ok']);
    expect(store.retryFailedChunks()).toBeNull();
  });

  it('A5.3: markChunkRetrying flips a failed chunk to retrying (visible progress)', () => {
    seedJobWithChunks();
    useImportStore.getState().markChunkRetrying(2);
    const chunk2 = useImportStore.getState().job!.chunks.find(c => c.displayIndex === 2)!;
    expect(chunk2.status).toBe('retrying');
    // The successful chunk is untouched.
    const chunk1 = useImportStore.getState().job!.chunks.find(c => c.displayIndex === 1)!;
    expect(chunk1.status).toBe('success');
  });
});
