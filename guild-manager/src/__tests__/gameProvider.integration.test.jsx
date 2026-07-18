// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { GameProvider } from "../app/GameProvider";
import { useGameActions, useGameSelector } from "../app/useGame";

afterEach(cleanup);

const Probe = () => {
  const guildName = useGameSelector((game) => game.guildSetup.name);
  const actions = useGameActions();
  return (
    <button type="button" onClick={() => actions.changeGuildSetup("name", "Selectors Guild")}>
      {guildName || "Unnamed"}
    </button>
  );
};

describe("GameProvider integration", () => {
  it("publishes provider changes through selectors and the stable action facade", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GameProvider><Probe /></GameProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: "Selectors Guild" })).toBeTruthy();
  });
});
