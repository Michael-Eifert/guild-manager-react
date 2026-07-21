import { useContext, useSyncExternalStore } from "react";

import { GameContext, type GameContextStore } from "./GameContext";
import type { GameActions, GameProviderSnapshot } from "./gameTypes";

const isContextStore = (
  value: GameContextStore<GameProviderSnapshot> | GameProviderSnapshot,
): value is GameContextStore<GameProviderSnapshot> =>
  typeof (value as GameContextStore<GameProviderSnapshot>).getSnapshot === "function";

export const useGameSelector = <T>(selector: (game: GameProviderSnapshot) => T): T => {
  const contextValue = useContext(GameContext);
  if (!contextValue) throw new Error("useGame must be used within GameProvider");

  const store = isContextStore(contextValue) ? contextValue : null;
  const subscribe = store ? store.subscribe : () => () => false;
  const getSnapshot: () => GameProviderSnapshot = store
    ? store.getSnapshot
    : () => contextValue as GameProviderSnapshot;
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
};

export const useGame = () => useGameSelector((game) => game);
export const useGameActions = (): GameActions =>
  useGameSelector((game) => game.actions || (game as unknown as GameActions));
