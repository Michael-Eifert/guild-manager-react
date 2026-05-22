import { describe, expect, it } from "vitest";

import { GUILD_DUNGEON_ACTIVITY } from "../constants";
import { normalizeGuildSetup } from "../guild/guildSetup";
import { PVP_ACTIVITY_FOCUS } from "../pvp/battlefields/battlefieldDefinitions";

describe("guild setup defaults", () => {
  it("starts new guilds with balanced dungeons and low PvP activity", () => {
    const setup = normalizeGuildSetup({});

    expect(setup.dungeonActivity).toBe(GUILD_DUNGEON_ACTIVITY.BALANCED);
    expect(setup.pvpActivityFocus).toBe(PVP_ACTIVITY_FOCUS.LOW);
  });
});
