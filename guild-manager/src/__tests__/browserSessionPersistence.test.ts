// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  BROWSER_SESSION_STORAGE_KEY,
  clearBrowserSession,
  readBrowserSession,
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

    clearBrowserSession();

    expect(readBrowserSession()).toBeNull();
    expect(window.localStorage.getItem("unrelated-setting")).toBe("keep");
  });
});
