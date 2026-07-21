import { createContext } from "react";

import type { GameProviderSnapshot } from "./gameTypes";

export type GameContextStore<T> = {
  getSnapshot: () => T;
  setSnapshot: (nextSnapshot: T) => void;
  subscribe: (listener: () => void) => () => boolean;
};

export const GameContext = createContext<
  GameContextStore<GameProviderSnapshot> | GameProviderSnapshot | null
>(null);

export const createGameContextStore = <T>(initialSnapshot: T): GameContextStore<T> => {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();
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
