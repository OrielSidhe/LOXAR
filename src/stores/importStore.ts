/**
 * importStore.ts — Zustand store for the Grammar Importer job lifecycle.
 *
 * Design (Gauntlet E1–E4):
 *  - The induction job lives OUTSIDE the GrammarImporterModal component.
 *    Closing the modal must NEVER cancel a running job or lose progress.
 *  - The store tracks per-chunk state: status, partial manifest, notes.
 *  - Partial results are auto-saved to localStorage so close→reopen resumes.
 *  - An AbortController wrapper lets us cancel a run cleanly if requested,
 *    but on modal-close we leave the job running in the background.
 *
 * State machine per job:
 *   idle → running → done | error
 *   idle → running → cancelled
 */

import { create } from 'zustand';
import type { DeclarativeManifest } from '../services/grammar/declarativeFormat';
import type { InductResult, InductProgress } from '../services/grammar/inductFromText';
import type { FlexibleGrammar } from '../types/grammar-flexible';

// ── Types ─────────────────────────────────────────────────────────────────

export type ChunkStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'retrying';
export type JobStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface StoredChunk {
  /** 1-based display index */
  displayIndex: number;
  status: ChunkStatus;
  /** Partial manifest from this chunk (if successful) */
  manifest?: DeclarativeManifest;
  /** Notes produced during this chunk (retries, fallbacks, etc.) */
  notes: string[];
  /** Confidence from this chunk (0–100) */
  confidence?: number;
  /** Character count of the chunk text */
  charCount?: number;
}

export interface InductJob {
  id: string;                 // stable UUID for this job
  status: JobStatus;
  text: string;               // full raw text being processed
  fileName?: string;          // original filename (for naming the grammar)
  totalChunks: number;
  chunks: StoredChunk[];
  progress: InductProgress | null;
  result: InductResult | null;
  fullGrammar: FlexibleGrammar | null;
  error: string | null;
  startTime: number;
  endTime: number | null;
  /** Whether AI is available for this job */
  aiAvailable: boolean;
}

// ── AbortController ownership (A1: single owner of the run's signal) ────────
//
// The AbortController for a running job lives OUTSIDE the persisted job state
// (AbortControllers are not serializable). This side-table maps job_id → the
// controller that owns the in-flight fetch chain. cancelJob() aborts it; the
// controller is removed when the job reaches a terminal state.
//
// The job (and its controller) live in the store, NOT inside a component's
// useEffect — so React 18 StrictMode's double-invoke of effects can never
// abort an in-flight run (A6: StrictMode safety). The component only
// subscribes to store state; cleanup of a subscription never touches the run.
const jobControllers = new Map<string, AbortController>();

/** Return the AbortController that owns this job's in-flight fetch, if any. */
export function getJobSignal(jobId: string): AbortSignal | null {
  return jobControllers.get(jobId)?.signal ?? null;
}

/** Register the owning controller for a job and return its signal. */
export function registerJobController(jobId: string): AbortSignal {
  const existing = jobControllers.get(jobId);
  if (existing) return existing.signal;
  const controller = new AbortController();
  jobControllers.set(jobId, controller);
  return controller.signal;
}

/** Remove the owning controller once the job is terminal. */
function unregisterJobController(jobId: string): void {
  jobControllers.delete(jobId);
}

// ── LocalStorage persistence ──────────────────────────────────────────────

const STORAGE_KEY = 'loxar_importer_jobs_v1';

function loadPersistedJob(): InductJob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only resume a job that was running (not yet completed/saved)
    if (parsed && parsed.status === 'running') {
      return parsed as InductJob;
    }
    return null;
  } catch {
    return null;
  }
}

function savePersistedJob(job: InductJob | null): void {
  try {
    if (job) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore — localStorage may be unavailable (SSR, private mode)
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

export interface ImportState {
  /** The active job, or null if none running. */
  job: InductJob | null;
  /**
   * Whether the modal is open. The job can outlive the modal:
   * onClose does NOT cancel the job.
   */
  isModalOpen: boolean;

  // ── Actions ──
  /** Open the modal. If a running job exists in storage, resume it. */
  openModal: (initialText?: string, fileName?: string, aiAvailable?: boolean) => void;
  /** Close the modal. Does NOT cancel the job. */
  closeModal: () => void;
  /** Start a new induction job. Replaces any prior non-terminal job. */
  startJob: (text: string, fileName?: string, aiAvailable?: boolean) => void;
  /** Update progress for the current job (called by onProgress). */
  updateProgress: (progress: InductProgress, chunkNotes?: string[]) => void;
  /** Mark a chunk as done with its partial manifest. */
  completeChunk: (displayIndex: number, manifest: DeclarativeManifest, confidence: number, notes?: string[]) => void;
  /** Mark a chunk as failed. */
  failChunk: (displayIndex: number, errorNote: string) => void;
  /** Set the final result of the job. */
  setJobResult: (result: InductResult) => void;
  /** Set the final FlexibleGrammar (post-conversion) of the job. */
  setJobGrammar: (grammar: FlexibleGrammar | null) => void;
  /** Mark the job as errored. */
  setError: (error: string) => void;
  /** Cancel the running job. */
  cancelJob: () => void;
  /** Clear the job entirely (after it's been saved to the conlang). */
  clearJob: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  job: null,
  isModalOpen: false,

  openModal: (initialText, fileName, aiAvailable) => {
    const persisted = loadPersistedJob();
    set(state => ({
      isModalOpen: true,
      job: persisted || state.job || null,
    }));
    // If no persisted or running job, initialize from args (lazy — don't start)
    if (!persisted && !get().job) {
      // We don't auto-start; the modal component decides when to start.
      // But we seed the job with the text so the textarea shows the right content.
      const seed: InductJob = {
        id: crypto.randomUUID(),
        status: 'idle',
        text: initialText || '',
        fileName,
        totalChunks: 0,
        chunks: [],
        progress: null,
        result: null,
        fullGrammar: null,
        error: null,
        startTime: 0,
        endTime: null,
        aiAvailable: aiAvailable ?? true,
      };
      set({ job: seed });
    }
  },

  closeModal: () => {
    // Close the modal UI but KEEP the job running (NADA se pierde).
    set({ isModalOpen: false });
    // Persist running job so it survives modal close + reopen
    const job = get().job;
    if (job && (job.status === 'running' || job.status === 'idle')) {
      savePersistedJob(job);
    }
  },

  startJob: (text, fileName, aiAvailable) => {
    // Replace any prior non-terminal job
    const job: InductJob = {
      id: crypto.randomUUID(),
      status: 'running',
      text,
      fileName,
      totalChunks: 0,
      chunks: [],
      progress: null,
      result: null,
      fullGrammar: null,
      error: null,
      startTime: Date.now(),
      endTime: null,
      aiAvailable: aiAvailable ?? true,
    };
    // A1: register the owning AbortController before the run starts so the
    // caller can thread getJobSignal(job.id) into the LLM fetch chain.
    registerJobController(job.id);
    set({ job });
    savePersistedJob(job);
  },

  updateProgress: (progress, chunkNotes) => {
    const job = get().job;
    if (!job) return;

    // On the first progress event, initialize all chunks as 'pending'
    // and mark the current one as 'running'. This enables the chunk list
    // and incremental manifest tracking.
    let chunks = job.chunks;
    if (chunks.length === 0 && progress.total > 0) {
      chunks = [];
      for (let i = 1; i <= progress.total; i++) {
        chunks.push({
          displayIndex: i,
          status: i === progress.chunk ? 'running' : 'pending',
          notes: [],
          charCount: i === progress.chunk ? progress.charCount : undefined,
        });
      }
    } else {
      // Mark chunks before current as 'success' (they completed),
      // set current to 'running', leave later ones as 'pending'.
      chunks = chunks.map(c => {
        if (c.displayIndex < progress.chunk) {
          return { ...c, status: 'success' };
        }
        if (c.displayIndex === progress.chunk) {
          return {
            ...c,
            status: 'running',
            notes: [...c.notes, ...(chunkNotes || [])],
            charCount: progress.charCount ?? c.charCount,
          };
        }
        return c;
      });

      // If total changed (shouldn't normally), pad the array
      if (chunks.length < progress.total) {
        for (let i = chunks.length + 1; i <= progress.total; i++) {
          chunks.push({
            displayIndex: i,
            status: 'pending',
            notes: [],
          });
        }
      }
    }

    set({
      job: {
        ...job,
        progress,
        totalChunks: progress.total,
        chunks,
      },
    });
    savePersistedJob(get().job);
  },

  completeChunk: (displayIndex, manifest, confidence, notes) => {
    const job = get().job;
    if (!job) return;
    set({
      job: {
        ...job,
        chunks: job.chunks.map(c =>
          c.displayIndex === displayIndex
            ? {
                ...c,
                status: 'success',
                manifest,
                confidence,
                notes: [...c.notes, ...(notes || [])],
              }
            : c
        ),
      },
    });
    savePersistedJob(get().job);
  },

  failChunk: (displayIndex, errorNote) => {
    const job = get().job;
    if (!job) return;
    set({
      job: {
        ...job,
        chunks: job.chunks.map(c =>
          c.displayIndex === displayIndex
            ? { ...c, status: 'failed', notes: [...c.notes, errorNote] }
            : c
        ),
      },
    });
    savePersistedJob(get().job);
  },

  setJobResult: (result) => {
    const job = get().job;
    if (!job) return;
    unregisterJobController(job.id); // run finished — release the controller
    const completed: InductJob = {
      ...job,
      status: 'done',
      result,
      endTime: Date.now(),
      progress: null,
    };
    set({ job: completed });
    savePersistedJob(null); // done — clear persisted
  },

  setJobGrammar: (grammar) => {
    const job = get().job;
    if (!job) return;
    set({ job: { ...job, fullGrammar: grammar } });
    savePersistedJob(get().job);
  },

  setError: (error) => {
    const job = get().job;
    if (!job) return;
    unregisterJobController(job.id); // run ended in error — release the controller
    set({
      job: {
        ...job,
        status: 'error',
        error,
        endTime: Date.now(),
        progress: null,
      },
    });
    // Keep error state in storage too — user can see it on reopen
    savePersistedJob(get().job);
  },

  cancelJob: () => {
    const job = get().job;
    if (!job) return;
    // A1: abort the owning controller so the in-flight fetch chain stops NOW.
    // This is the ONLY path that aborts the run — the user (J2) or retry logic.
    const controller = jobControllers.get(job.id);
    controller?.abort();
    unregisterJobController(job.id);
    set({
      job: { ...job, status: 'cancelled', endTime: Date.now(), progress: null },
    });
    savePersistedJob(null);
  },

  /**
   * A5: retry ONLY the chunks that previously failed, without re-running the
   * whole document. Successful chunks keep their manifests. Returns the signal
   * the caller should thread into a fresh inductFromText scoped to failed
   * chunks (the modal wires this in Phase J).
   */
  retryFailedChunks: () => {
    const job = get().job;
    if (!job) return null;
    const failedCount = job.chunks.filter(c => c.status === 'failed').length;
    if (failedCount === 0) return null;
    // Re-arm as running and register a fresh owning controller for the retry run.
    set({ job: { ...job, status: 'running', endTime: null, error: null } });
    return registerJobController(job.id);
  },

  /** Mark a chunk as mid-retry (A4: retrying status visible in the job). */
  markChunkRetrying: (displayIndex: number) => {
    const job = get().job;
    if (!job) return;
    set({
      job: {
        ...job,
        chunks: job.chunks.map(c =>
          c.displayIndex === displayIndex && c.status === 'failed'
            ? { ...c, status: 'retrying' }
            : c
        ),
      },
    });
    savePersistedJob(get().job);
  },

  clearJob: () => {
    set({ job: null });
    savePersistedJob(null);
  },
}));

// ── Hook wrapper for convenience ──────────────────────────────────────────

export const useImportJob = () => {
  const job = useImportStore(state => state.job);
  const isModalOpen = useImportStore(state => state.isModalOpen);
  const startJob = useImportStore(state => state.startJob);
  const updateProgress = useImportStore(state => state.updateProgress);
  const completeChunk = useImportStore(state => state.completeChunk);
  const failChunk = useImportStore(state => state.failChunk);
  const setJobResult = useImportStore(state => state.setJobResult);
  const setJobGrammar = useImportStore(state => state.setJobGrammar);
  const setError = useImportStore(state => state.setError);
  const cancelJob = useImportStore(state => state.cancelJob);
  const clearJob = useImportStore(state => state.clearJob);
  const openModal = useImportStore(state => state.openModal);
  const closeModal = useImportStore(state => state.closeModal);

  return {
    job,
    isModalOpen,
    startJob,
    updateProgress,
    completeChunk,
    failChunk,
    setJobResult,
    setJobGrammar,
    setError,
    cancelJob,
    clearJob,
    openModal,
    closeModal,
  };
};
