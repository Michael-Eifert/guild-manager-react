import { describe, expect, it } from "vitest";

import {
  GUILD_DUNGEON_ACTIVITY,
  REALM_DIFFICULTY,
} from "../constants";
import { normalizeGuildSetup } from "../guild/guildSetup";
import { PVP_ACTIVITY_FOCUS } from "../pvp/battlefields/battlefieldDefinitions";

describe("guild setup defaults", () => {
  it("starts new guilds with balanced dungeons and low PvP activity", () => {
    const setup = normalizeGuildSetup({});

    expect(setup.dungeonActivity).toBe(GUILD_DUNGEON_ACTIVITY.BALANCED);
    expect(setup.pvpActivityFocus).toBe(PVP_ACTIVITY_FOCUS.LOW);
    expect(setup.realmDifficulty).toBe(REALM_DIFFICULTY.NORMAL);
  });

  it("normalizes supported realm difficulties and falls back to Normal", () => {
    expect(normalizeGuildSetup({ realmDifficulty: REALM_DIFFICULTY.EASY }).realmDifficulty)
      .toBe(REALM_DIFFICULTY.EASY);
    expect(normalizeGuildSetup({ realmDifficulty: REALM_DIFFICULTY.HARD }).realmDifficulty)
      .toBe(REALM_DIFFICULTY.HARD);
    expect(normalizeGuildSetup({ realmDifficulty: "Mythic" }).realmDifficulty)
      .toBe(REALM_DIFFICULTY.NORMAL);
  });
});
