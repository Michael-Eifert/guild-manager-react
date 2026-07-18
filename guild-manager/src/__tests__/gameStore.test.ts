import { describe, expect, it, vi } from "vitest";

import { createGameStore } from "../app/createGameStore";
import type { GameState } from "../app/gameTypes";

const makeState = (): GameState => ({
  clock: { gameTimeMs: 0, gameSpeed: 1, isPaused: false },
  guild: {},
  roster: [{ id: "hero", name: "Before" }],
  missions: {},
  calendar: {},
  realm: {},
  pvp: {},
  inventory: {},
  log: [],
});

describe("GameStore", () => {
  it("publishes one atomic update for a changed command", () => {
    const store = createGameStore(makeState());
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: "roster/update", characterId: "hero", changes: { name: "After" } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().roster[0].name).toBe("After");
  });

  it("advances the clock deterministically and publishes once per tick", () => {
    const store = createGameStore(makeState());
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: "clock/tick", realNow: 100 });
    store.dispatch({ type: "clock/tick", realNow: 125 });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().clock.gameTimeMs).toBe(25);
  });
});
