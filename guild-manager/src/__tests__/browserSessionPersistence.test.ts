// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  BROWSER_SESSION_STORAGE_KEY,
  clearBrowserSession,
  getActiveBrowserSaveSlot,
  listBrowserSaveSlots,
  prepareNewBrowserSession,
  readBrowserSession,
  setActiveBrowserSaveSlot,
  writeBrowserSession,
} from "../session/browserSessionPersistence";

describe("browser session persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and retrieves the complete versioned session envelope", () => {
    const payload = {
      format: "guild-manager-session",
      version: 12,
      savedAt: "2026-07-26T12:00:00.000Z",
      data: { guildSetup: { hasStarted: true, name: "Browser Guild" } },
    };

    expect(writeBrowserSession(payload)).toBe(true);
    expect(JSON.parse(readBrowserSession() || "{}")).toEqual(payload);
    expect(
      window.localStorage.getItem(BROWSER_SESSION_STORAGE_KEY),
    ).toBeTruthy();
  });

  it("can preserve a validated imported session without changing its payload", () => {
    const rawSession = JSON.stringify({
      format: "guild-manager-session",
      version: 11,
      data: { roster: [{ id: "legacy-browser-member" }] },
    });

    expect(writeBrowserSession(rawSession, true)).toBe(true);
    expect(readBrowserSession()).toBe(rawSession);
  });

  it("clears only the browser autosave slot", () => {
    window.localStorage.setItem("unrelated-setting", "keep");
    writeBrowserSession({ data: { roster: [] } });

    expect(clearBrowserSession()).toBe(true);

    expect(readBrowserSession()).toBeNull();
    expect(window.localStorage.getItem("unrelated-setting")).toBe("keep");
  });

  it("stores three independent saves and writes only to the active slot", () => {
    writeBrowserSession({
      savedAt: "2026-07-20T12:00:00.000Z",
      data: { guildSetup: { name: "First Guild" } },
    });
    setActiveBrowserSaveSlot(2);
    writeBrowserSession({
      savedAt: "2026-07-21T12:00:00.000Z",
      data: { guildSetup: { name: "Second Guild" } },
    });
    setActiveBrowserSaveSlot(3);
    writeBrowserSession({
      savedAt: "2026-07-22T12:00:00.000Z",
      data: { guildSetup: { name: "Third Guild" } },
    });

    expect(getActiveBrowserSaveSlot()).toBe(3);
    expect(JSON.parse(readBrowserSession(1) || "{}").data.guildSetup.name).toBe(
      "First Guild",
    );
    expect(JSON.parse(readBrowserSession(2) || "{}").data.guildSetup.name).toBe(
      "Second Guild",
    );
    expect(listBrowserSaveSlots().map((slot) => slot.guildName)).toEqual([
      "First Guild",
      "Second Guild",
      "Third Guild",
    ]);
  });

  it("selects the newest legacy-compatible slot when no active slot exists", () => {
    writeBrowserSession(
      {
        savedAt: "2026-07-20T12:00:00.000Z",
        data: { guildSetup: { name: "Older Guild" } },
      },
      false,
      1,
    );
    window.localStorage.removeItem("guild-manager.browser-active-save.v1");
    window.localStorage.setItem(
      `${BROWSER_SESSION_STORAGE_KEY}.slot-2`,
      JSON.stringify({
        savedAt: "2026-07-23T12:00:00.000Z",
        data: { guildSetup: { name: "Newest Guild" } },
      }),
    );

    expect(getActiveBrowserSaveSlot()).toBe(2);
    expect(JSON.parse(readBrowserSession() || "{}").data.guildSetup.name).toBe(
      "Newest Guild",
    );
  });

  it("prepares a selected slot for a new game without deleting other saves", () => {
    writeBrowserSession({ data: { guildSetup: { name: "Keep Me" } } }, false, 1);
    writeBrowserSession({ data: { guildSetup: { name: "Replace Me" } } }, false, 2);

    expect(prepareNewBrowserSession(2)).toBe(true);

    expect(getActiveBrowserSaveSlot()).toBe(2);
    expect(readBrowserSession()).toBeNull();
    expect(readBrowserSession(1)).toContain("Keep Me");
  });
});
