import { describe, expect, it } from "vitest";

import {
  getLfgCandidateKind,
  getLfgHelperInterest,
  getLfgLevelRange,
  hasDungeonEquipmentUpgrade,
  passesDeterministicLfgChance,
} from "../social/dungeonLfgInterest";
import type { Character } from "../types/characterTypes";
import type { ItemDefinition } from "../types/itemTypes";
import type { Mission } from "../types/missionTypes";

const shadowfangKeep: Mission = {
  id: "shadowfang-keep",
  name: "Shadowfang Keep",
  type: "dungeon",
  level: 22,
  minLevel: 15,
  recommended: "22 - 30",
  requiredPartySize: 5,
};

const weakChest: ItemDefinition = {
  id: "weak-chest",
  name: "Worn Robe",
  slot: "chest",
  type: "Cloth",
  quality: 1,
  minLevel: 1,
  itemLevel: 5,
};

const shadowfangUpgrade: ItemDefinition = {
  id: "shadowfang-upgrade",
  name: "Arugal's Robe",
  dungeon: "Shadowfang Keep",
  slot: "chest",
  type: "Cloth",
  quality: 3,
  minLevel: 20,
  itemLevel: 35,
  stats: { intellect: 8 },
};

const helper: Character & Record<string, unknown> = {
  id: "helper",
  name: "Helper",
  level: 31,
  charClass: "Mage",
  role: "DPS",
  equipment: { chest: weakChest },
};

describe("dungeon LFG interest", () => {
  it("uses a two-level tolerance without changing the dungeon entry level", () => {
    expect(getLfgLevelRange(shadowfangKeep)).toEqual({
      minimum: 20,
      maximum: 30,
    });
    expect(
      getLfgCandidateKind({ level: 19 }, shadowfangKeep),
    ).toBe("below-range");
    expect(getLfgCandidateKind({ level: 20 }, shadowfangKeep)).toBe("core");
    expect(getLfgCandidateKind({ level: 30 }, shadowfangKeep)).toBe("core");
    expect(getLfgCandidateKind({ level: 31 }, shadowfangKeep)).toBe("helper");
    expect(shadowfangKeep.minLevel).toBe(15);
  });

  it("raises helper interest for real upgrades and positive relationships", () => {
    expect(
      hasDungeonEquipmentUpgrade({
        character: helper,
        mission: shadowfangKeep,
        itemDatabase: [shadowfangUpgrade],
      }),
    ).toBe(true);

    expect(
      getLfgHelperInterest({
        character: helper,
        mission: shadowfangKeep,
      }),
    ).toMatchObject({
      chance: 10,
      baseChance: 10,
      upgradeBonus: 0,
      relationshipBonus: 0,
      overlevelDelta: 1,
    });
    expect(
      getLfgHelperInterest({
        character: helper,
        mission: shadowfangKeep,
        itemDatabase: [shadowfangUpgrade],
        relationshipPoints: 40,
      }),
    ).toMatchObject({
      chance: 50,
      upgradeBonus: 30,
      relationshipBonus: 10,
      hasUpgrade: true,
    });
  });

  it("reduces far-overlevel interest to the floor and keeps rolls deterministic", () => {
    const interest = getLfgHelperInterest({
      character: { ...helper, level: 60 },
      mission: shadowfangKeep,
    });
    expect(interest.baseChance).toBe(2);
    expect(interest.chance).toBe(2);
    expect(passesDeterministicLfgChance("stable-seed", 37)).toBe(
      passesDeterministicLfgChance("stable-seed", 37),
    );
  });
});
