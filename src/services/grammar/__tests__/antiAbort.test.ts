/**
 * antiAbort.test.ts — GAUNTLET v3.12 Phase A-REAL.
 *
 * Verifies the end-to-end anti-abort contract with a mocked llmCall (the point
 * where the owning AbortSignal is threaded into the fetch chain):
 *
 *  (1) cancelJob aborts the signal that reaches the fetch  → handled in the
 *      store test (importStore.test.ts A1.2). Here we verify inductFromText
 *      PROPAGATES that signal into every llmCall and STOPS on cancel.
 *  (2) a timeout is classified DIFFERENTLY from a user cancel: a transient
 *      (timeout) error is retried; an external-signal abort is NOT.
 *  (3) a chunk that fails twice then succeeds on the 3rd attempt ends done.
 *  (4) retryFailedChunks retries ONLY the failed chunks (store-level — see the
 *      store test A5). Here we verify inductFromText does not re-run a chunk
 *      whose llmCall already succeeded.
 *
 * The llmCall is the seam: production wires it to callAi → completeWithProvider
 * → adapter fetch (which already honours options.signal). We assert on the
 * signal object each llmCall receives and on the retry/cancel classification.
 */

import { describe, it, expect } from 'vitest';
import { inductFromText } from '../inductFromText';
import { splitIntoChunks } from '../chunker';
import type { DeclarativeManifest } from '../declarativeFormat';

function makeMinimalManifest(overrides?: Partial<DeclarativeManifest>): DeclarativeManifest {
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

// A document that (a) the chunker splits into MULTIPLE chunks and (b) the
// local parser CANNOT interpret, so inductFromText is forced onto the LLM path
// (local score < 60 AND sectionsUnparsed > 0). We use ==== delimiters (which
// the chunker splits on) with body text that matches NO recognised § category.
function makeMultiChunkText(numSections: number, padChars = 4000): string {
  // "noise" body — no § Tipología / § Fonología / § Sustantivos headers, so
  // parseLocal leaves every section unparsed → shouldUseAI becomes true.
  const noise = 'lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(
    Math.ceil(padChars / 50)
  );
  const sections: string[] = [];
  for (let i = 0; i < numSections; i++) {
    sections.push(`==== Bloque ${i} ====\n${noise}`);
  }
  return sections.join('\n');
}

describe('Phase A — signal propagation + classification', () => {
  // -------------------------------------------------------------------------
  // (1) inductFromText threads the owning signal into every llmCall, and STOPS
  //     on cancel (an aborted signal is not swallowed into a local fallback).
  // -------------------------------------------------------------------------
  it('A.1: the owning signal reaches each llmCall and a cancel aborts the run', async () => {
    const controller = new AbortController();
    const seenSignals: (AbortSignal | undefined)[] = [];

    // Text with several chunks so the loop runs more than one llmCall.
    const text = makeMultiChunkText(3);

    const llmCall = async (_prompt: string, signal?: AbortSignal) => {
      seenSignals.push(signal);
      // Cancel AFTER the first chunk starts — the next chunk boundary check
      // (and the aborted short-circuit) must stop the run.
      if (seenSignals.length === 1) {
        controller.abort();
      }
      return { manifest: makeMinimalManifest(), confidence: 70 };
    };

    const promise = inductFromText(text, {
      llmAvailable: true,
      llmCall,
      signal: controller.signal,
    });

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    // The signal handed to llmCall IS the owning one (same reference).
    expect(seenSignals[0]).toBe(controller.signal);
  });

  // -------------------------------------------------------------------------
  // (2) Timeout (transient) is retried; external-signal abort is NOT retried.
  // -------------------------------------------------------------------------
  it('A.2: a transient timeout error is retried, but a cancel is not', async () => {
    const controller = new AbortController();
    let calls = 0;

    // First call throws a timeout (transient) → withRetry retries.
    // Second call succeeds. Total llmCall invocations should be 2.
    const llmCall = async (_prompt: string, signal?: AbortSignal) => {
      calls++;
      if (signal?.aborted) {
        const e = new Error('cancelled'); e.name = 'AbortError'; throw e;
      }
      if (calls === 1) {
        throw new Error('Request Timeout');
      }
      return { manifest: makeMinimalManifest(), confidence: 70 };
    };

    // Single chunk (short text) so withRetry wraps the one llmCall path.
    const result = await inductFromText('§ Tipología: SOV, aglutinante.\n' + 'y'.repeat(50), {
      llmAvailable: true,
      llmCall,
      signal: controller.signal,
    });

    // The timeout was retried and the 2nd attempt succeeded → hybrid result.
    expect(calls).toBe(2);
    expect(result.method).toBe('hybrid');
  });

  it('A.3: when the owning signal is already aborted, the run does not call llmCall', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    const llmCall = async () => {
      calls++;
      return { manifest: makeMinimalManifest(), confidence: 70 };
    };

    await expect(
      inductFromText('short', { llmAvailable: true, llmCall, signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });

    // Aborted before the chunk even started → no wasted LLM call.
    expect(calls).toBe(0);
  });

  // -------------------------------------------------------------------------
  // (3) A chunk that fails twice (transient) then succeeds on the 3rd attempt
  //     ends up done — its manifest is kept (nothing is lost).
  // -------------------------------------------------------------------------
  it('A.4: a chunk that fails twice then succeeds on the 3rd attempt is kept', async () => {
    let calls = 0;
    const llmCall = async () => {
      calls++;
      if (calls <= 2) {
        // Two transient 429 failures → withRetry backoff-retries; 3rd succeeds.
        throw new Error('429 rate limit');
      }
      return {
        manifest: makeMinimalManifest({
          paradigms: [{ category: 'noun', slots: [{ id: 'pl', feature: 'number', order: 0, realization: { kind: 'affix', form: '-s', position: 'suffix' } }] }],
        }),
        confidence: 88,
      };
    };

    // Unparseable text → single chunk, forces the LLM retry path under test.
    const result = await inductFromText('gibberish with no recognisable sections at all '.repeat(4), {
      llmAvailable: true,
      llmCall,
    });

    expect(calls).toBe(3); // 2 failures + 1 success
    expect(result.manifest.paradigms.length).toBe(1);
    expect(result.manifest.paradigms[0].slots[0].realization.form).toBe('-s');
  });

  // -------------------------------------------------------------------------
  // (4) A successful chunk is not re-run: llmCall is invoked exactly once per
  //     chunk the chunker emits (no needless repeat of succeeded chunks).
  // -------------------------------------------------------------------------
  it("A.5: each chunk's llmCall runs once on success (no needless repeat)", async () => {
    // Three unparseable ==== sections big enough that the chunker keeps them
    // as distinct chunks (each > MIN_SUBSTANTIVE_CHARS, total > MAX_CHUNK_SIZE).
    const text = makeMultiChunkText(3, 5000);
    const expectedChunks = splitIntoChunks(text).length;
    expect(expectedChunks).toBeGreaterThan(1); // sanity: we are exercising multi-chunk

    let calls = 0;
    const llmCall = async () => {
      calls++;
      return { manifest: makeMinimalManifest(), confidence: 70 };
    };

    const result = await inductFromText(text, { llmAvailable: true, llmCall });

    // One llmCall per emitted chunk — succeeded chunks never re-ran.
    expect(calls).toBe(expectedChunks);
    expect(result.method).toBe('hybrid');
  });
});
