import type { ReactNode } from "react";

import { GameContext } from "./GameContext";
import { useGameProviderController } from "./useGameProviderController";

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const store = useGameProviderController();
  return <GameContext.Provider value={store}>{children}</GameContext.Provider>;
};
