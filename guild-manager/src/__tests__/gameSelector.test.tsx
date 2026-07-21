// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGameContextStore, GameContext } from "../app/GameContext";
import { useGameSelector } from "../app/useGame";

afterEach(cleanup);

describe("useGameSelector", () => {
  it("does not rerender when an unrelated snapshot field changes", () => {
    const store = createGameContextStore({ guild: { name: "A" }, clock: 0 });
    const renders = vi.fn();
    const Consumer = () => {
      renders();
      const guild = useGameSelector((game) => game.guild);
      return <div>{guild.name}</div>;
    };
    render(<GameContext.Provider value={store}><Consumer /></GameContext.Provider>);
    act(() => store.setSnapshot({ guild: store.getSnapshot().guild, clock: 1 }));
    expect(screen.getByText("A")).toBeTruthy();
    expect(renders).toHaveBeenCalledTimes(1);
  });
});
