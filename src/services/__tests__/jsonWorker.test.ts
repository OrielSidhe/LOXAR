import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type WorkerMessage = { id: number; result?: unknown; error?: string };

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: WorkerMessage }) => void) | null = null;
  onerror: ((event: { message?: string; error?: unknown }) => void) | null = null;
  readonly posted: Array<Record<string, unknown>> = [];

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: Record<string, unknown>): void {
    this.posted.push(message);
  }

  reply(id: number, result: unknown): void {
    this.onmessage?.({ data: { id, result } });
  }

  replyError(id: number, error: string): void {
    this.onmessage?.({ data: { id, error } });
  }
}

async function freshModule(): Promise<typeof import('../jsonWorker')> {
  vi.resetModules();
  return import('../jsonWorker');
}

function enableFakeWorker(): void {
  vi.stubGlobal('Worker', FakeWorker);
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:test-worker' });
}

describe('jsonWorker', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa JSON nativo cuando no hay Worker disponible', async () => {
    const { parseJsonAsync, stringifyJsonAsync } = await freshModule();

    await expect(parseJsonAsync<{ a: number }>('{"a":1}')).resolves.toEqual({ a: 1 });
    await expect(stringifyJsonAsync({ a: 1 }, 2)).resolves.toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it('reenvía space al worker y resuelve parse/stringify por id', async () => {
    enableFakeWorker();
    const { parseJsonAsync, stringifyJsonAsync } = await freshModule();

    const stringifyPromise = stringifyJsonAsync({ a: 1 }, 2);
    const worker = FakeWorker.instances[0];
    expect(worker).toBeDefined();
    const stringifyMessage = worker.posted[0];
    expect(stringifyMessage).toMatchObject({ type: 'stringify', space: 2 });
    worker.reply(stringifyMessage.id as number, 'resultado');
    await expect(stringifyPromise).resolves.toBe('resultado');

    const parsePromise = parseJsonAsync<{ a: number }>('{"a":1}');
    const parseMessage = worker.posted[1];
    expect(parseMessage).toMatchObject({ type: 'parse' });
    worker.reply(parseMessage.id as number, { a: 1 });
    await expect(parsePromise).resolves.toEqual({ a: 1 });
  });

  it('rechaza errores del worker e ignora respuestas tardías', async () => {
    enableFakeWorker();
    const { parseJsonAsync } = await freshModule();

    const promise = parseJsonAsync('{"a":1}');
    const worker = FakeWorker.instances[0];
    const message = worker.posted[0];
    worker.replyError(message.id as number, 'falló el parseo');
    await expect(promise).rejects.toThrow('falló el parseo');

    expect(() => worker.reply(message.id as number, { a: 1 })).not.toThrow();
  });
});
