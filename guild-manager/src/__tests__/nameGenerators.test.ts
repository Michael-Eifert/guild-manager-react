import { describe, expect, it } from "vitest";

import { GUILD_FACTION } from "../constants";
import {
  generateRandomCharacterName,
  generateRandomGuildName,
} from "../guild/nameGenerators";

describe("start screen name generators", () => {
  it("generates faction-themed guild names", () => {
    expect(
      generateRandomGuildName(GUILD_FACTION.ALLIANCE, "", () => 0),
    ).toBe("Azure Banner");
    expect(generateRandomGuildName(GUILD_FACTION.HORDE, "", () => 0)).toBe(
      "Ashen Banner",
    );
  });

  it("uses the selected race and gender for character names", () => {
    expect(generateRandomCharacterName("Orc", "Female", "", () => 0)).toBe(
      "Draka",
    );
  });

  it("avoids immediately returning the current name when alternatives exist", () => {
    expect(
      generateRandomGuildName(
        GUILD_FACTION.ALLIANCE,
        "Azure Banner",
        () => 0,
      ),
    ).not.toBe("Azure Banner");
    expect(
      generateRandomCharacterName("Human", "Male", "Varian", () => 0),
    ).not.toBe("Varian");
  });
});
