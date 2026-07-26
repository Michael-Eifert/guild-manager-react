import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { GameContext } from "../app/GameContext";
import HomeRoot from "../pages/home/HomeRoot";
import StartPage from "../pages/start/StartPage";
import { ROUTES } from "../routes";
import { buildHomeNavigation } from "../components/shell/homeNavigation";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }) => <span data-route-redirect={to}>redirect:{to}</span>,
  };
});

const noop = () => {};

const renderWithGame = (element, game) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <GameContext.Provider value={game}>{element}</GameContext.Provider>
    </MemoryRouter>,
  );

describe("route contracts", () => {
  it("uses /start and /home based route constants", () => {
    expect(ROUTES.START).toBe("/start");
    expect(ROUTES.HOME).toBe("/home");
    expect(ROUTES.DASHBOARD).toBe("/home");
    expect(ROUTES.GUILD).toBe("/home/guild");
    expect(ROUTES.RECRUIT).toBe("/home/recruit");
    expect(ROUTES.CALENDAR).toBe("/home/calendar");
    expect(ROUTES.REALM).toBe("/home/realm");
    expect(ROUTES.MISSION_BOARD).toBe("/home/mission-board");
    expect(ROUTES.ADVENTURE_BOARD).toBe("/home/adventure-board");
    expect(ROUTES.DUNGEON_BOARD).toBe("/home/dungeon-board");
    expect(ROUTES.DUNGEON_BOARD_ALIAS).toBe("/dungeon-board");
    expect(ROUTES.BATTLEFIELDS).toBe("/home/battlefields");
    expect(ROUTES.BATTLEFIELDS_ALIAS).toBe("/battlefields");
    expect(ROUTES.PROFESSIONS).toBe("/home/professions");
    expect(ROUTES.DATABASE).toBe("/home/database");
    expect(ROUTES.GUILD_LOG).toBe("/home/guild-log");
    expect(ROUTES.GAME_SETTINGS).toBe("/home/game-settings");
  });

  it("places Game Settings last in the Tools navigation group", () => {
    const tools = buildHomeNavigation({
      applicationCount: 0,
      activeDungeonCount: 0,
      activeBattlefieldCount: 0,
      unreadChatCount: 0,
    }).filter((item) => item.group === "tools");

    expect(tools.at(-1)).toMatchObject({
      id: "game-settings",
      label: "Game Settings",
      kind: "route",
      to: ROUTES.GAME_SETTINGS,
    });
  });

  it("renders setup on /start before a guild exists", () => {
    const html = renderWithGame(<StartPage />, {
      dismissNotification: noop,
      guildSetup: { hasStarted: false, name: "" },
      handleGuildSetupChange: noop,
      handleLoadButtonClick: noop,
      handleLoadSessionFile: noop,
      handleStartGuild: noop,
      notifications: [],
      sessionFileInputRef: { current: null },
    });

    expect(html).toContain("Found Your Guild");
    expect(html).toContain("Start Game");
  });

  it("redirects /start to /home after a guild exists", () => {
    const html = renderWithGame(<StartPage />, {
      guildSetup: { hasStarted: true },
    });

    expect(html).toContain(`redirect:${ROUTES.HOME}`);
  });

  it("redirects /home to /start before a guild exists", () => {
    const html = renderWithGame(<HomeRoot />, {
      guildSetup: { hasStarted: false },
    });

    expect(html).toContain(`redirect:${ROUTES.START}`);
  });

});
