import { normalizeGuildRelationships } from "../social/relationshipSystem";
import type { Character } from "../types/characterTypes";
import {
  getCharacterAverageItemLevel,
  getCharacterPowerScore,
} from "../utils";

type MissionHistoryEntry = {
  result?: string;
  bossesCleared?: number | null;
};

type StatisticsCharacter = Character & {
  history?: MissionHistoryEntry[];
  itemLevel?: number;
};

type RelationshipEntry = {
  memberIds?: string[];
  points?: number;
};

export type EquipmentRankingEntry = {
  character: StatisticsCharacter;
  itemLevel: number;
  gearScore: number;
  powerScore: number;
};

export type PopularityRankingEntry = {
  character: StatisticsCharacter;
  positivePoints: number;
  positiveBonds: number;
};

export type ImpactRankingEntry = {
  character: StatisticsCharacter;
  impactScore: number;
  successfulRuns: number;
  bossesCleared: number;
  honorableKills: number;
};

export type GuildStatistics = {
  averageGearScore: number;
  activeMembers: number;
  positiveBonds: number;
  successfulRuns: number;
  equipmentLeaders: EquipmentRankingEntry[];
  popularityLeaders: PopularityRankingEntry[];
  impactLeaders: ImpactRankingEntry[];
};

const getName = (character: StatisticsCharacter) =>
  String(character?.name || "");

const compareNames = (
  left: { character: StatisticsCharacter },
  right: { character: StatisticsCharacter },
) => getName(left.character).localeCompare(getName(right.character));

const getHistory = (character: StatisticsCharacter) =>
  Array.isArray(character?.history) ? character.history : [];

const getSuccessfulRuns = (character: StatisticsCharacter) =>
  getHistory(character).filter((entry) => entry?.result === "Success").length;

const getBossesCleared = (character: StatisticsCharacter) =>
  getHistory(character).reduce(
    (total, entry) =>
      total + Math.max(0, Math.floor(Number(entry?.bossesCleared) || 0)),
    0,
  );

const getHonorableKills = (character: StatisticsCharacter) =>
  Math.max(0, Math.floor(Number(character?.pvp?.honorableKills) || 0));

const toGearScore = (itemLevel: number) =>
  Math.round(Math.max(0, itemLevel) * 10) / 10;

const isCharacterActive = (character: StatisticsCharacter) => {
  const status = String(character?.status || "").trim().toLowerCase();
  return Boolean(status && status !== "idle");
};

export const buildGuildStatistics = ({
  roster,
  relationships,
  limit = 5,
}: {
  roster: readonly StatisticsCharacter[];
  relationships?: Record<string, unknown> | null;
  limit?: number;
}): GuildStatistics => {
  const safeRoster = Array.isArray(roster) ? roster.filter(Boolean) : [];
  const rankingLimit = Math.max(1, Math.floor(Number(limit) || 5));
  const popularityById = new Map<
    string,
    { positivePoints: number; positiveBonds: number }
  >(
    safeRoster.map((character) => [
      String(character.id),
      { positivePoints: 0, positiveBonds: 0 },
    ]),
  );

  const normalizedRelationships = Object.values(
    normalizeGuildRelationships(relationships) as Record<
      string,
      RelationshipEntry
    >,
  );
  let positiveBonds = 0;
  normalizedRelationships.forEach((relationship) => {
    const points = Math.max(0, Math.floor(Number(relationship?.points) || 0));
    if (points <= 0) return;
    const guildMemberIds = (
      Array.isArray(relationship.memberIds) ? relationship.memberIds : []
    ).filter((memberId) => popularityById.has(String(memberId)));
    if (guildMemberIds.length < 2) return;
    positiveBonds += 1;
    guildMemberIds.forEach((memberId) => {
      const current = popularityById.get(String(memberId));
      if (!current) return;
      current.positivePoints += points;
      current.positiveBonds += 1;
    });
  });

  const equipmentRows = safeRoster.map((character) => {
    const itemLevel = Math.max(0, getCharacterAverageItemLevel(character));
    return {
      character,
      itemLevel,
      gearScore: toGearScore(itemLevel),
      powerScore: Math.max(0, getCharacterPowerScore(character)),
    };
  });
  const equipmentLeaders = [...equipmentRows]
    .sort(
      (left, right) =>
        right.itemLevel - left.itemLevel ||
        right.powerScore - left.powerScore ||
        compareNames(left, right),
    )
    .slice(0, rankingLimit);

  const popularityLeaders = safeRoster
    .map((character) => ({
      character,
      ...(popularityById.get(String(character.id)) || {
        positivePoints: 0,
        positiveBonds: 0,
      }),
    }))
    .sort(
      (left, right) =>
        right.positivePoints - left.positivePoints ||
        right.positiveBonds - left.positiveBonds ||
        compareNames(left, right),
    )
    .slice(0, rankingLimit);

  const impactRows = safeRoster.map((character) => {
    const successfulRuns = getSuccessfulRuns(character);
    const bossesCleared = getBossesCleared(character);
    const honorableKills = getHonorableKills(character);
    return {
      character,
      successfulRuns,
      bossesCleared,
      honorableKills,
      impactScore:
        successfulRuns * 10 +
        bossesCleared * 3 +
        Math.floor(honorableKills / 5),
    };
  });
  const impactLeaders = [...impactRows]
    .sort(
      (left, right) =>
        right.impactScore - left.impactScore ||
        right.successfulRuns - left.successfulRuns ||
        right.bossesCleared - left.bossesCleared ||
        compareNames(left, right),
    )
    .slice(0, rankingLimit);

  return {
    averageGearScore:
      equipmentRows.length > 0
        ? toGearScore(
            equipmentRows.reduce(
              (total, entry) => total + entry.gearScore,
              0,
            ) / equipmentRows.length,
          )
        : 0,
    activeMembers: safeRoster.filter(isCharacterActive).length,
    positiveBonds,
    successfulRuns: impactRows.reduce(
      (total, entry) => total + entry.successfulRuns,
      0,
    ),
    equipmentLeaders,
    popularityLeaders,
    impactLeaders,
  };
};
