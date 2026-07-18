import { useCallback, useRef, useState, type MutableRefObject } from "react";

export type StateUpdater<T> = T | ((current: T) => T);
export type StateCommit<T> = (update: StateUpdater<T>) => T;

/**
 * Keeps imperative runtime reads and React rendering on one commit path.
 * The ref is updated synchronously before React schedules its render.
 */
export const useSynchronizedState = <T>(
  initialValue: T | (() => T),
): [T, StateCommit<T>, MutableRefObject<T>] => {
  const initialRef = useRef<{ initialized: boolean; value: T }>({
    initialized: false,
    value: undefined as T,
  });
  if (!initialRef.current.initialized) {
    initialRef.current = {
      initialized: true,
      value:
        typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue,
    };
  }

  const [state, setState] = useState<T>(initialRef.current.value);
  const stateRef = useRef<T>(initialRef.current.value);
  const commit = useCallback<StateCommit<T>>((update) => {
    const nextState =
      typeof update === "function"
        ? (update as (current: T) => T)(stateRef.current)
        : update;
    stateRef.current = nextState;
    setState(nextState);
    return nextState;
  }, []);

  return [state, commit, stateRef];
};
