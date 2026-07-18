import { useContext, useSyncExternalStore } from "react";

import { GameContext } from "./GameContext";

export const useGameSelector = (selector) => {
  const store = useContext(GameContext);
  if (!store) {
    throw new Error("useGame must be used within GameProvider");
  }
  const isExternalStore = typeof store.getSnapshot === "function";
  const subscribe = isExternalStore ? store.subscribe : () => () => {};
  const getSnapshot = isExternalStore ? store.getSnapshot : () => store;
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
};

export const useGame = () => useGameSelector((game) => game);

export const useGameActions = () => useGameSelector((game) => game.actions || game);
