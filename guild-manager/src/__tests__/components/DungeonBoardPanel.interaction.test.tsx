// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DungeonBoardPanel from "../../components/DungeonBoardPanel";

afterEach(cleanup);

const missions = [
  {
    id: "core-fragment",
    type: "dungeon",
    name: "Blackrock Depths - Core Fragment",
    dungeonWing: "Shadowforge City",
    entryLevel: 42,
    minLevel: 42,
    rewardKeys: ["molten_core_attunement"],
  },
  {
    id: "molten-core",
    type: "dungeon",
    name: "Molten Core",
    isRaid: true,
    requiresKey: true,
    keyId: "molten_core_attunement",
  },
];

const roster = [
  {
    id: "low",
    name: "Growing Hero",
    level: 30,
    role: "DPS",
    status: "Idle",
    keys: [],
  },
  {
    id: "raider",
    name: "Busy Raider",
    level: 60,
    role: "Tank",
    status: "Raid",
    keys: [],
  },
  {
    id: "attuned",
    name: "Already Attuned",
    level: 60,
    role: "Healer",
    status: "Idle",
    keys: ["molten_core_attunement"],
  },
];

describe("DungeonBoardPanel attunement planner", () => {
  it("selects all members who need an attunement even while busy or below level", () => {
    const onQueueAdventureGoal = vi.fn(() => true);

    render(
      <DungeonBoardPanel
        roster={roster}
        missionList={missions}
        activeMissions={[
          {
            id: "active-raid",
            instanceId: "active-raid:1",
            type: "dungeon",
            isRaid: true,
            memberIds: ["raider"],
          },
        ]}
        socialState={{ searches: [] }}
        gameTimeMs={5_000}
        onQueueAdventureGoal={onQueueAdventureGoal}
        onClearAdventureGoal={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Attunement Planner" }),
    );

    expect(screen.getByText("Growing Hero")).toBeTruthy();
    expect(screen.getByText("Busy Raider")).toBeTruthy();
    expect(screen.queryByText("Already Attuned")).toBeNull();
    expect(screen.getByText("Ready at Lv 42")).toBeTruthy();
    expect(screen.getByText("In Raid · Next")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Select All" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Queue 2 for Shadowforge City",
      }),
    );

    expect(onQueueAdventureGoal).toHaveBeenCalledWith({
      memberIds: expect.arrayContaining(["low", "raider"]),
      keyId: "molten_core_attunement",
      sourceMissionId: "core-fragment",
      targetMissionId: "key:molten_core_attunement",
    });
  });
});
