import React from "react";
import { describe, expect, it } from "vitest";

import LfgSearchCard from "../../components/dungeons/LfgSearchCard";
import type { LfgSearch } from "../../social/chatTypes";
import { render } from "./componentTestUtils";

const search: LfgSearch = {
  id: "lfg-1",
  missionId: "deadmines",
  missionName: "The Deadmines",
  missionType: "dungeon",
  targetSize: 5,
  phase: "general",
  createdAt: 0,
  guildSearchEndsAt: 15_000,
  expiresAt: 75_000,
  nextResponseAt: 35_000,
  participantIds: ["guild-1", "realm-1"],
  participants: [
    {
      id: "guild-1",
      source: "guild",
      name: "Ironstance",
      race: "Dwarf",
      gender: "Male",
      charClass: "Warrior",
      role: "Tank",
      level: 20,
    },
    {
      id: "realm-1",
      source: "realm",
      name: "Moonmender",
      guildName: "Realm Regulars",
      race: "Night Elf",
      gender: "Female",
      charClass: "Priest",
      role: "DPS",
      level: 19,
    },
  ],
  initiatorId: "guild-1",
};

describe("LfgSearchCard", () => {
  it("shows group progress, phase, countdown and distinguished participants", () => {
    const html = render(
      <LfgSearchCard search={search} gameTimeMs={30_000} />,
    );

    expect(html).toContain("Group Forming · 2/5");
    expect(html).toContain("The Deadmines");
    expect(html).toContain("Realm Search");
    expect(html).toContain("1 Guild / 1 Realm");
    expect(html).toContain("45s remaining");
    expect(html).toContain("Ironstance");
    expect(html).toContain("Moonmender");
    expect(html).toContain("Realm Regulars");
    expect(html).toContain("border-amber-500/70");
    expect(html).toContain("Open ·");
    expect(html).toContain("Healer");
  });
});
