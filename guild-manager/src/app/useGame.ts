import { useCallback, useContext, useRef, useSyncExternalStore } from "react";

import { GameContext, type GameContextStore } from "./GameContext";
import type { GameActions, GameProviderSnapshot } from "./gameTypes";

const isContextStore = (
  value: GameContextStore<GameProviderSnapshot> | GameProviderSnapshot,
): value is GameContextStore<GameProviderSnapshot> =>
  typeof (value as GameContextStore<GameProviderSnapshot>).getSnapshot === "function";

export type SelectorEquality<T> = (previous: T, next: T) => boolean;

export const shallowEqual = <T extends Record<string, unknown>>(previous: T, next: T) => {
  if (Object.is(previous, next)) return true;
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  return previousKeys.length === nextKeys.length
    && previousKeys.every((key) => Object.is(previous[key], next[key]));
};

export const useGameSelector = <T>(
  selector: (game: GameProviderSnapshot) => T,
  equality: SelectorEquality<T> = Object.is,
): T => {
  const contextValue = useContext(GameContext);
  if (!contextValue) throw new Error("useGame must be used within GameProvider");

  const store = isContextStore(contextValue) ? contextValue : null;
  const subscribe = useCallback(
    (listener: () => void) => (store ? store.subscribe(listener) : () => false),
    [store],
  );
  const getSnapshot = useCallback(
    (): GameProviderSnapshot => (store ? store.getSnapshot() : contextValue as GameProviderSnapshot),
    [contextValue, store],
  );
  const selectedRef = useRef<{ hasValue: boolean; value?: T }>({ hasValue: false });

  const getSelectedSnapshot = useCallback(() => {
    const next = selector(getSnapshot());
    const selected = selectedRef.current;
    if (selected.hasValue && equality(selected.value as T, next)) {
      return selected.value as T;
    }
    selectedRef.current = { hasValue: true, value: next };
    return next;
  }, [equality, getSnapshot, selector]);

  return useSyncExternalStore(
    subscribe,
    getSelectedSnapshot,
    getSelectedSnapshot,
  );
};

export const useGame = () => useGameSelector((game) => game);
export const useGameActions = (): GameActions =>
  useGameSelector((game) => game.actions || (game as unknown as GameActions));
