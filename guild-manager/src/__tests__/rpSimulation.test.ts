import { describe, expect, it } from "vitest";

import {
  attachGuildIncidentToScene,
  advanceRpScenes,
  enqueueMissionRpScene,
  enqueueRealmNewsRpScene,
  findRelationshipPair,
  resolveGuildIncidentRpScene,
} from "../social/rpSimulation";
import {
  createInitialSocialState,
  ensureSocialState,
} from "../social/socialSimulation";
import type { PartyParticipant } from "../social/chatTypes";
import type { GuildIncident } from "../guildRelations/guildRelations";

const member = (
  id: string,
  role: string,
  source: "guild" | "realm" = "guild",
): PartyParticipant => ({
  id,
  source,
  name: id,
  charClass: role === "Healer" ? "Priest" : role === "Tank" ? "Warrior" : "Mage",
  role,
  level: 60,
});

const incident: GuildIncident = {
  id: "incident-1",
  kind: "blame",
  title: "Mission Blame",
  description: "A failed run caused an argument.",
  actorId: "dps",
  subjectId: "tank",
  dayIndex: 2,
  expiresDayIndex: 3,
  source: "mission",
  status: "pending",
  choices: [
    {
      id: "mediate",
      label: "Review the run",
      description: "Turn blame into a constructive debrief.",
      relationshipDelta: 5,
      moraleDelta: 2,
      target: "both",
    },
  ],
};

describe("Tavern RP simulation", () => {
  it("uses the most strained guild pair and the actual failed boss", () => {
    const participants = [
      member("tank", "Tank"),
      member("healer", "Healer"),
      member("dps", "DPS"),
    ];
    const relationships = {
      "dps::tank": { memberIds: ["dps", "tank"], points: -22 },
      "healer::tank": { memberIds: ["healer", "tank"], points: 8 },
      "dps::healer": { memberIds: ["dps", "healer"], points: -4 },
    };

    const pair = findRelationshipPair({
      participants,
      relationships,
      mode: "lowest",
    });
    const state = enqueueMissionRpScene({
      state: createInitialSocialState(),
      mission: {
        id: "deadmines",
        instanceId: "run-1",
        name: "The Deadmines",
        dungeonBosses: ["Rhahk'Zor", "Sneed", "Edwin VanCleef"],
        dungeonProgress: { failedAtStep: 2 },
      },
      participants,
      relationships,
      succeeded: false,
      now: 10_000,
      dayIndex: 1,
    });

    expect(pair).toMatchObject({ points: -22 });
    expect(new Set([pair?.actor.id, pair?.subject.id])).toEqual(
      new Set(["dps", "tank"]),
    );
    expect(state.rpScenes[0]).toMatchObject({
      bossName: "Sneed",
      tag: "Run Failed",
    });
    expect(state.rpScenes[0]?.turns[0]?.intent).toBe("rp-blame");
    expect(state.rpScenes[0]?.turns[0]?.subjectiveClaim).toMatch(
      /pressure on the target/,
    );
  });

  it("keeps failure dialogue collective when no relationship is negative", () => {
    const state = enqueueMissionRpScene({
      state: createInitialSocialState(),
      mission: { id: "stockades", instanceId: "run-2", name: "The Stockade" },
      participants: [member("tank", "Tank"), member("healer", "Healer")],
      relationships: {
        "healer::tank": { memberIds: ["healer", "tank"], points: 3 },
      },
      succeeded: false,
      now: 20_000,
      dayIndex: 1,
    });

    expect(state.rpScenes[0]?.turns.map((turn) => turn.intent)).toEqual([
      "rp-run-failure",
      "rp-run-failure",
    ]);
  });

  it("schedules one scene at a time and never lets AI determine mechanics", () => {
    let state = enqueueMissionRpScene({
      state: createInitialSocialState(),
      mission: { id: "run", instanceId: "run-3", name: "Blackrock Depths" },
      participants: [member("tank", "Tank"), member("dps", "DPS")],
      succeeded: true,
      now: 0,
      dayIndex: 1,
    });
    state = enqueueRealmNewsRpScene({
      state,
      news: { id: "news-1", type: "raid-clear", message: "A guild cleared Molten Core." },
      participants: [member("guild", "DPS"), member("realm", "DPS", "realm")],
      now: 0,
      dayIndex: 1,
    });
    state = advanceRpScenes({ state, now: 0, deferText: true });

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      channel: "tavern",
      contentKind: "roleplay",
      generationStatus: "pending",
      text: "",
    });
    expect(state.rpScenes.filter((scene) => scene.status === "active")).toHaveLength(1);
    expect(state.rpScenes.filter((scene) => scene.status === "queued")).toHaveLength(1);
  });

  it("turns guild structure news into event-specific Tavern rumors", () => {
    const state = enqueueRealmNewsRpScene({
      state: createInitialSocialState(),
      news: {
        id: "news-merger",
        type: "npc-guild-merger",
        message: "Dawnspire and Night Oath formed a new guild.",
      },
      participants: [member("guild", "DPS"), member("realm", "DPS", "realm")],
      now: 0,
      dayIndex: 4,
    });

    expect(state.rpScenes[0]?.turns.map((turn) => turn.intent)).toEqual([
      "rp-guild-merger",
      "rp-guild-merger",
    ]);
  });

  it("links a manual incident to its scene and resumes after one resolution", () => {
    let state = enqueueMissionRpScene({
      state: createInitialSocialState(),
      mission: { id: "run", instanceId: "run-4", name: "Stratholme" },
      participants: [member("tank", "Tank"), member("dps", "DPS")],
      relationships: {
        "dps::tank": { memberIds: ["dps", "tank"], points: -20 },
      },
      succeeded: false,
      now: 0,
      dayIndex: 2,
    });
    state = attachGuildIncidentToScene({
      state,
      incident,
      participants: [member("tank", "Tank"), member("dps", "DPS")],
      guildMaster: member("gm", "Healer"),
      relationshipPoints: -20,
      now: 0,
    });
    state = advanceRpScenes({ state, now: 0, deferText: false });
    state = advanceRpScenes({ state, now: 10_000, deferText: false });
    state = advanceRpScenes({ state, now: 20_000, deferText: false });

    expect(state.rpScenes[0]?.status).toBe("awaiting-choice");
    expect(state.messages.every((message) => message.incidentId === incident.id)).toBe(true);

    const resolvedIncident = {
      ...incident,
      status: "resolved" as const,
      resolvedChoiceId: "mediate",
      resolvedBy: "player" as const,
    };
    state = resolveGuildIncidentRpScene({
      state,
      incident: resolvedIncident,
      guildMaster: member("gm", "Healer"),
      now: 20_000,
    });
    state = resolveGuildIncidentRpScene({
      state,
      incident: resolvedIncident,
      guildMaster: member("gm", "Healer"),
      now: 20_000,
    });

    expect(
      state.rpScenes[0]?.turns.filter((turn) => turn.intent === "rp-leadership"),
    ).toHaveLength(1);
  });

  it("normalizes legacy social state with a Tavern read marker", () => {
    const state = ensureSocialState({
      messages: [],
      searches: [],
      nextSequence: 1,
      lastSearchCheckpoint: -1,
      lastReadSequenceByChannel: { guild: 4, general: 2 },
    });
    expect(state.lastReadSequenceByChannel).toEqual({
      guild: 4,
      general: 2,
      tavern: 0,
    });
    expect(state.rpScenes).toEqual([]);
  });
});
