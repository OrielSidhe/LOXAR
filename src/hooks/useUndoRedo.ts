import { useCallback, useRef, useState } from 'react';

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
  set: (newPresent: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearFuture: () => void;
}

/**
 * Generic undo/redo hook with history stack.
 * 
 * @param initialPresent - The initial state
 * @returns Object with current state and operations
 */
export function useUndoRedo<T>(initialPresent: T): UndoRedoState<T> {
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [version, setVersion] = useState(0); // Force re-render on stack changes

  const set = useCallback((newPresent: T) => {
    pastRef.current = [...pastRef.current, present];
    futureRef.current = [];
    setPresent(newPresent);
    setVersion(v => v + 1);
  }, [present]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [present, ...futureRef.current];
    setPresent(previous);
    setVersion(v => v + 1);
  }, [present]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, present];
    setPresent(next);
    setVersion(v => v + 1);
  }, [present]);

  const clearFuture = useCallback(() => {
    futureRef.current = [];
    setVersion(v => v + 1);
  }, []);

  return {
    past: pastRef.current,
    present,
    future: futureRef.current,
    set,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    clearFuture,
  };
}
