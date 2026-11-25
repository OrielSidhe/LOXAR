/**
 * jsonWorker.ts
 * ----------------------------------------------------------------------------
 * Wrapper liviano para ejecutar JSON.parse / JSON.stringify en un Web Worker
 * y evitar bloquear el hilo principal cuando un lexicon es muy grande.
 * ----------------------------------------------------------------------------
 */

const workerCode = `
self.onmessage = (event) => {
  const { id, type, payload, space } = event.data;
  try {
    if (type === 'parse') {
      const result = JSON.parse(payload);
      self.postMessage({ id, type, result });
    } else if (type === 'stringify') {
      const result = JSON.stringify(payload, null, space);
      self.postMessage({ id, type, result });
    } else {
      self.postMessage({ id, type, error: 'Unsupported json worker type' });
    }
  } catch (error) {
    self.postMessage({ id, type, error: (error && error.message) || String(error) });
  }
};
`;

/** Shape of the untyped message posted back by the worker script. */
interface JsonWorkerMessage {
  id: number;
  result?: unknown;
  error?: string;
}

interface PendingTask {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, PendingTask>();

function getWorker(): Worker {
  if (!worker) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    worker = new Worker(url, { type: 'module' });
    worker.onmessage = (event: MessageEvent<JsonWorkerMessage>) => {
      const { id, error, result } = event.data;
      if (typeof id !== 'number') return;
      const task = pending.get(id);
      if (!task) return;
      pending.delete(id);
      if (error) task.reject(new Error(error));
      else task.resolve(result);
    };
    worker.onerror = (event: ErrorEvent) => {
      const error = event.message || event.error || new Error('Worker error');
      pending.forEach((task) => task.reject(error));
      pending.clear();
    };
  }
  return worker;
}

export async function parseJsonAsync<T = unknown>(payload: string): Promise<T> {
  if (typeof Worker === 'undefined') {
    return JSON.parse(payload) as T;
  }
  const id = nextId++;
  const worker = getWorker();
  return new Promise<T>((resolve, reject) => {
    // The worker returns untyped JSON; the generic is the caller's assertion of its shape.
    pending.set(id, { resolve: (value) => resolve(value as T), reject });
    worker.postMessage({ id, type: 'parse', payload });
  });
}

export async function stringifyJsonAsync<T>(payload: T, space?: number): Promise<string> {
  if (typeof Worker === 'undefined') {
    return JSON.stringify(payload, null, space);
  }
  const id = nextId++;
  const worker = getWorker();
  return new Promise<string>((resolve, reject) => {
    // The worker returns an untyped string; only this function knows its contract.
    pending.set(id, { resolve: (value) => resolve(value as string), reject });
    worker.postMessage({ id, type: 'stringify', payload, space });
  });
}
