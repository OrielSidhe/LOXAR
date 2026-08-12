/**
 * jsonWorker.ts
 * ----------------------------------------------------------------------------
 * Wrapper liviano para ejecutar JSON.parse / JSON.stringify en un Web Worker
 * y evitar bloquear el hilo principal cuando un lexicon es muy grande.
 * ----------------------------------------------------------------------------
 */

const workerCode = `
self.onmessage = (event) => {
  const { id, type, payload } = event.data;
  try {
    if (type === 'parse') {
      const result = JSON.parse(payload);
      self.postMessage({ id, type, result });
    } else if (type === 'stringify') {
      const result = JSON.stringify(payload);
      self.postMessage({ id, type, result });
    } else {
      self.postMessage({ id, type, error: 'Unsupported json worker type' });
    }
  } catch (error) {
    self.postMessage({ id, type, error: (error && error.message) || String(error) });
  }
};
`;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>();

function getWorker(): Worker {
  if (!worker) {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    worker = new Worker(url, { type: 'module' });
    worker.onmessage = (event) => {
      const { id, error, result } = event.data;
      const task = pending.get(id);
      if (!task) return;
      pending.delete(id);
      if (error) task.reject(new Error(error));
      else task.resolve(result);
    };
    worker.onerror = (event) => {
      const error = event.message || event.error || new Error('Worker error');
      pending.forEach((task) => task.reject(error));
      pending.clear();
    };
  }
  return worker;
}

export async function parseJsonAsync<T = any>(payload: string): Promise<T> {
  if (typeof Worker === 'undefined') {
    return JSON.parse(payload) as T;
  }
  const id = nextId++;
  const worker = getWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type: 'parse', payload });
  });
}

export async function stringifyJsonAsync<T = any>(payload: T, space?: number): Promise<string> {
  if (typeof Worker === 'undefined') {
    return JSON.stringify(payload, null as any, space);
  }
  const id = nextId++;
  const worker = getWorker();
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type: 'stringify', payload });
  });
}
