import { createContext } from "react";

export const GameContext = createContext(null);

export const createGameContextStore = (initialSnapshot) => {
  let snapshot = initialSnapshot;
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    setSnapshot(nextSnapshot) {
      if (Object.is(snapshot, nextSnapshot)) return;
      snapshot = nextSnapshot;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
