// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  getSessionDownloadFilename,
  readPreferredSessionFilename,
  writePreferredSessionFilename,
} from "../session/sessionExportFilename";

describe("session export filenames", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses the existing timestamped filename when no name is provided", () => {
    expect(
      getSessionDownloadFilename("", new Date("2026-07-28T12:34:56.789Z")),
    ).toBe("guild-session-2026-07-28T12-34-56-789Z.json");
  });

  it("sanitizes custom names and avoids a duplicate json extension", () => {
    expect(getSessionDownloadFilename(' Vanilla:Oath?.json ')).toBe(
      "Vanilla-Oath.json",
    );
  });

  it("persists the preferred name and clears it when the field is emptied", () => {
    expect(writePreferredSessionFilename("Raid Night")).toBe(true);
    expect(readPreferredSessionFilename()).toBe("Raid Night");

    expect(writePreferredSessionFilename("")).toBe(true);
    expect(readPreferredSessionFilename()).toBe("");
  });
});
