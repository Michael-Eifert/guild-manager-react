import { getDefaultDungeonProgress } from "../game/dungeonEngine";
import { applyMoraleDelta, MORALE_WIPE_DELTA } from "../game/characterMorale";
import { getGuildFocusBonuses } from "../guild/guildSetup";
import {
  evaluateMissionKeyAccess,
  getDungeonBossCount,
  getMissionGoldReward,
  getMissionWipeCost,
} from "./missionHelpers";
import { getRaidLockoutStatus, getRaidResumeProgress } from "../raids/raidLockouts";
import { getKeyLabel, getMissionSuccessPreview, getMissionVeteranCoverage } from "../utils";
import { getPartyMoraleSuccessBonus } from "../game/characterMorale";
import { getRelationshipSuccessModifier } from "../social/relationshipSystem";
import { formatConsumableUseSummary } from "../professions/consumableEffects";
import type { Character, GameServices, GuildLogEntry, Mission, NotificationInput } from "../app/gameTypes";

type AnyRecord = Record<string, any>;
const createDungeonProgress = getDefaultDungeonProgress as (
  mission: AnyRecord,
  startTime: number,
  totalDuration: number,
) => AnyRecord;
const readRaidResumeProgress = getRaidResumeProgress as unknown as (input: AnyRecord) => number;
const readRaidLockoutStatus = getRaidLockoutStatus as unknown as (input: AnyRecord) => AnyRecord;

export type MissionWipeCostResult = {
  updatedGold: number;
  wipeCostLog: GuildLogEntry | null;
};

export const applyMissionWipeCosts = (
  mission: AnyRecord,
  stepLogs: AnyRecord[],
  availableGold: number,
): MissionWipeCostResult => {
  if (mission?.type !== "dungeon") return { updatedGold: availableGold, wipeCostLog: null };
  const wipeEvents = (Array.isArray(stepLogs) ? stepLogs : []).filter(
    (log) => log?.type === "mission-attempt",
  );
  if (wipeEvents.length === 0) return { updatedGold: availableGold, wipeCostLog: null };

  const wipeCost = getMissionWipeCost(mission);
  if (wipeCost <= 0) return { updatedGold: availableGold, wipeCostLog: null };

  const totalCost = wipeCost * wipeEvents.length;
  const paidAmount = Math.max(0, Math.min(Math.floor(availableGold), totalCost));
  const unpaidAmount = Math.max(0, totalCost - paidAmount);
  return {
    updatedGold: Math.max(0, availableGold - paidAmount),
    wipeCostLog: {
      type: "wipe-cost",
      missionName: mission?.name || "Dungeon",
      wipeCount: wipeEvents.length,
      wipeCost,
      amount: paidAmount,
      unpaidAmount,
    },
  };
};

export const getMissionInstanceId = (mission: AnyRecord) =>
  String(mission.instanceId || `${mission.questId || mission.id}-${mission.startTime || 0}`);

export const getAdjustedMissionSuccessPreview = ({
  mission,
  members,
  guildFocus,
  relationships,
}: {
  mission: AnyRecord;
  members: AnyRecord[];
  guildFocus?: unknown;
  relationships: AnyRecord;
}) => {
  const preview = getMissionSuccessPreview(mission, members);
  const dungeonBonus =
    mission?.type === "dungeon"
      ? getGuildFocusBonuses(guildFocus).dungeonSuccessBonus
      : 0;
  const veteranCoverage = getMissionVeteranCoverage(mission, members);
  const moraleSuccessBonus =
    mission?.type === "dungeon" ? getPartyMoraleSuccessBonus(members) : 0;
  const relationshipModifier = getRelationshipSuccessModifier({
    relationships,
    memberIds: members.map((member) => member?.id),
  });
  const adjustedSuccess = Math.min(
    100,
    Math.max(
      0,
      preview.successChance +
        dungeonBonus +
        veteranCoverage.successBonus +
        moraleSuccessBonus +
        relationshipModifier.successModifier,
    ),
  );
  return {
    ...preview,
    successChance: adjustedSuccess,
    failChance: Math.max(0, 100 - adjustedSuccess),
    focusSuccessBonus: dungeonBonus,
    moraleSuccessBonus,
    relationshipSuccessModifier: relationshipModifier.successModifier,
    relationshipSuccessModifierLevel: relationshipModifier.level,
    relationshipSuccessModifierPair: relationshipModifier.affectedPairKey,
    veteranSuccessBonus: veteranCoverage.successBonus,
    veteranExperiencedCount: veteranCoverage.experiencedCount,
    veteranCoverageRatio: veteranCoverage.coverageRatio,
  };
};

export const sortDungeonChainMissions = (left: AnyRecord, right: AnyRecord) => {
  if ((left?.level || 0) !== (right?.level || 0)) return (left?.level || 0) - (right?.level || 0);
  const wingOrder = (Number(left?.wingOrder) || 0) - (Number(right?.wingOrder) || 0);
  return wingOrder || String(left?.name || "").localeCompare(String(right?.name || ""));
};

export const buildMissionRun = ({
  quest,
  memberIds,
  startTime,
  roster,
  chainContext = null,
  runOptions = {},
  raidLockouts,
  currentDayIndex,
  services,
  getSuccessPreview,
}: {
  quest: AnyRecord;
  memberIds: string[];
  startTime: number;
  roster: Character[];
  chainContext?: AnyRecord | null;
  runOptions?: AnyRecord;
  raidLockouts: AnyRecord;
  currentDayIndex: number;
  services: GameServices;
  getSuccessPreview: (mission: AnyRecord, members: Character[]) => AnyRecord;
}) => {
  const selectedMembers = roster.filter((character) => memberIds.includes(character.id));
  const missionPreview = getSuccessPreview(quest, selectedMembers);
  const consumableModifiers = runOptions?.consumableModifiers || null;
  const consumableSuccessBonus = Number(consumableModifiers?.successBonusPercent) || 0;
  const successChance = Math.min(
    100,
    Math.max(0, missionPreview.successChance + consumableSuccessBonus),
  );
  const totalDuration = quest.duration * 1000;
  const dungeonProgress =
    quest.type === "dungeon" ? createDungeonProgress(quest, startTime, totalDuration) : null;
  let resumedDungeonProgress = dungeonProgress;
  let adjustedTotalDuration = totalDuration;
  let adjustedFinishTime = startTime + totalDuration;

  if (quest?.isRaid === true && dungeonProgress) {
    const resumeClearedSteps = readRaidResumeProgress({
      raidLockouts,
      mission: quest,
      currentDayIndex,
      memberIds,
    });
    const bossCount = getDungeonBossCount(quest);
    const safeResumeSteps = Math.max(0, Math.min(bossCount - 1, resumeClearedSteps));
    if (safeResumeSteps > 0) {
      const remainingSteps = Math.max(1, bossCount - safeResumeSteps);
      adjustedTotalDuration = dungeonProgress.stepDuration * remainingSteps;
      adjustedFinishTime = startTime + adjustedTotalDuration;
      resumedDungeonProgress = {
        ...dungeonProgress,
        currentStep: safeResumeSteps,
        clearedSteps: safeResumeSteps,
        lootAwardedSteps: Array.from({ length: safeResumeSteps }, (_, index) => index + 1),
        nextStepAt: startTime + dungeonProgress.stepDuration,
      };
    }
  }

  return {
    ...quest,
    instanceId: services.createId(),
    payoutGold: getMissionGoldReward(quest),
    wipeCost: getMissionWipeCost(quest),
    missionSuccess: quest.type === "dungeon" ? undefined : services.random() * 100 < successChance,
    successChance,
    failChance: Math.max(0, 100 - successChance),
    consumableModifiers,
    consumableSummary: formatConsumableUseSummary(consumableModifiers),
    moraleSuccessBonus: missionPreview.moraleSuccessBonus,
    partyPower: missionPreview.partyPower,
    missionPower: missionPreview.missionPower,
    questId: quest.id,
    startTime,
    finishTime: adjustedFinishTime,
    totalDuration: adjustedTotalDuration,
    dungeonProgress: resumedDungeonProgress,
    memberIds: [...memberIds],
    chainContext: chainContext
      ? {
          ...chainContext,
          remainingMissionIds: Array.isArray(chainContext.remainingMissionIds)
            ? [...chainContext.remainingMissionIds]
            : [],
        }
      : null,
  };
};

type ChainResult = {
  queuedMission: AnyRecord | null;
  updatedRoster: Character[];
  chainLogs: GuildLogEntry[];
  notification: NotificationInput | null;
};

export const resolveDungeonChainContinuation = ({
  mission,
  missionSucceeded,
  roster,
  startTime,
  missionList,
  raidLockouts,
  currentDayIndex,
  buildRun,
}: {
  mission: AnyRecord;
  missionSucceeded: boolean;
  roster: Character[];
  startTime: number;
  missionList: AnyRecord[];
  raidLockouts: AnyRecord;
  currentDayIndex: number;
  buildRun: (
    mission: AnyRecord,
    memberIds: string[],
    startTime: number,
    roster: Character[],
    chainContext: AnyRecord,
  ) => AnyRecord;
}): ChainResult => {
  const chainContext = mission?.chainContext;
  if (
    mission?.type !== "dungeon" ||
    !chainContext ||
    !Array.isArray(mission?.memberIds) ||
    mission.memberIds.length === 0
  ) {
    return { queuedMission: null, updatedRoster: roster, chainLogs: [], notification: null };
  }

  const chainName = chainContext?.setName || mission?.dungeonSetName || "Dungeon Chain";
  const remainingIds = Array.isArray(chainContext?.remainingMissionIds)
    ? chainContext.remainingMissionIds
    : [];
  const total = Math.max(1, Number(chainContext?.totalMissions) || remainingIds.length + 1);
  const position = Math.max(1, Math.min(total, Number(chainContext?.currentPosition) || 1));
  const stoppedLog = (missionName: string) => ({
    type: "dungeon-chain",
    outcome: "stopped",
    chainName,
    missionName,
    position,
    total,
  });

  if (!missionSucceeded) {
    return { queuedMission: null, updatedRoster: roster, chainLogs: [stoppedLog(mission.name)], notification: null };
  }
  if (remainingIds.length === 0) {
    return {
      queuedMission: null,
      updatedRoster: roster,
      chainLogs: [{ ...stoppedLog(mission.name), outcome: "completed", position: total }],
      notification: {
        type: "success",
        title: "Dungeon Chain Complete",
        message: `${chainName} finished.`,
        durationMs: 3600,
      },
    };
  }

  const nextMission = missionList.find((entry) => entry.id === remainingIds[0]);
  if (!nextMission || nextMission.type !== "dungeon") {
    return {
      queuedMission: null,
      updatedRoster: roster,
      chainLogs: [stoppedLog(mission.name)],
      notification: { type: "error", title: "Dungeon Chain Stopped", message: "Missing mission data for next wing." },
    };
  }

  const partyMembers = roster.filter((character) => mission.memberIds.includes(character.id));
  const keyAccess = evaluateMissionKeyAccess({ missions: [nextMission], partyMembers });
  if (!keyAccess.canEnter) {
    const missingKeyLabel = keyAccess.missingKeyIds.map((keyId: string) => getKeyLabel(keyId) || keyId).join(", ");
    return {
      queuedMission: null,
      updatedRoster: roster,
      chainLogs: [stoppedLog(nextMission.name)],
      notification: {
        type: "error",
        title: "Dungeon Chain Stopped",
        message: `Missing key for ${nextMission.dungeonWing || nextMission.name}: ${missingKeyLabel}.`,
      },
    };
  }

  if (nextMission.isRaid === true) {
    const raidStatus = readRaidLockoutStatus({
      raidLockouts,
      mission: nextMission,
      currentDayIndex,
      memberIds: mission.memberIds,
    });
    if (raidStatus.isWingLocked) {
      const missingWings =
        raidStatus.missingRequiredWingLabels?.join(", ") ||
        raidStatus.missingRequiredWingIds?.join(", ") ||
        "required wings";
      return {
        queuedMission: null,
        updatedRoster: roster,
        chainLogs: [stoppedLog(nextMission.name)],
        notification: {
          type: "error",
          title: "Raid Chain Stopped",
          message: `${nextMission.dungeonWing || nextMission.name} unlocks after clearing: ${missingWings}.`,
        },
      };
    }
  }

  const nextPosition = Math.min(total, position + 1);
  const nextContext = {
    ...chainContext,
    totalMissions: total,
    currentPosition: nextPosition,
    remainingMissionIds: remainingIds.slice(1),
  };
  const queuedMission = buildRun(nextMission, mission.memberIds, startTime, roster, nextContext);
  return {
    queuedMission: mission.calendarEventId
      ? { ...queuedMission, calendarEventId: mission.calendarEventId }
      : queuedMission,
    updatedRoster: roster.map((character) =>
      mission.memberIds.includes(character.id)
        ? { ...character, status: "Questing", statusText: `Chain: ${nextMission.name}` }
        : character,
    ),
    chainLogs: [{
      type: "dungeon-chain",
      outcome: "continued",
      chainName,
      missionName: nextMission.name,
      position: nextPosition,
      total,
    }],
    notification: {
      type: "info",
      title: "Dungeon Chain",
      message: `Next wing: ${nextMission.dungeonWing || nextMission.name} (${nextPosition}/${total})`,
      durationMs: 2800,
    },
  };
};

export const applyDungeonStepLootAwards = ({
  activeMissions,
  finishedMissions,
  roster,
  stepLogs,
  awardDungeonStepLoot,
}: {
  activeMissions: AnyRecord[];
  finishedMissions: AnyRecord[];
  roster: Character[];
  stepLogs: AnyRecord[];
  awardDungeonStepLoot?: (input: AnyRecord) => AnyRecord | null;
}) => {
  if (typeof awardDungeonStepLoot !== "function") {
    return { activeMissions, finishedMissions, roster, logs: stepLogs };
  }
  let nextRoster = roster;
  const nextActive = [...activeMissions];
  const nextFinished = [...finishedMissions];
  const allMissions = [
    ...nextActive.map((mission, index) => ({ mission, index, bucket: "active" })),
    ...nextFinished.map((mission, index) => ({ mission, index, bucket: "finished" })),
  ];
  const logs: AnyRecord[] = [];

  for (const log of Array.isArray(stepLogs) ? stepLogs : []) {
    logs.push(log);
    if (log?.type !== "dungeon-step") continue;
    const matching = allMissions.find(({ mission }) => {
      const instanceId = String(log?.missionInstanceId || "");
      return instanceId
        ? getMissionInstanceId(mission) === instanceId
        : mission?.name === log?.missionName && mission?.type === "dungeon";
    });
    if (!matching) continue;

    if (log.outcome === "failed") {
      const memberIds = new Set(
        (Array.isArray(matching.mission?.memberIds) ? matching.mission.memberIds : [])
          .map((memberId: unknown) => String(memberId || "")),
      );
      nextRoster = nextRoster.map((member) =>
        memberIds.has(String(member?.id || "")) ? applyMoraleDelta(member, MORALE_WIPE_DELTA) : member,
      );
      continue;
    }
    if (log.outcome !== "cleared") continue;

    const award = awardDungeonStepLoot({ mission: matching.mission, currentRoster: nextRoster, stepLog: log });
    if (!award?.mission) continue;
    matching.mission = award.mission;
    if (matching.bucket === "active") nextActive[matching.index] = award.mission;
    else nextFinished[matching.index] = award.mission;
    nextRoster = award.updatedRoster || nextRoster;
    if (Array.isArray(award.missionLogs)) logs.push(...award.missionLogs);
  }
  return { activeMissions: nextActive, finishedMissions: nextFinished, roster: nextRoster, logs };
};

export type { Mission };
