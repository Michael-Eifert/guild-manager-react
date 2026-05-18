import { GUILD_FACTION } from "../constants";
import {
  ZONE_DEFINITIONS,
  getZoneEliteQuestTemplates,
  isZoneAccessibleForFaction,
} from "./zoneDefinitions";

export const WORLD_MAP_FILTERS = Object.freeze({
  ACTIVE: "Active",
  AVAILABLE: "Available",
  CLEARED: "Cleared",
  ALL: "All",
});

const clampProgress = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const getMemberId = (member) => member?.id ?? member?.name;

const getMemberName = (member) => member?.name ?? "Unknown Hero";

export const getCharacterZoneProgressForZone = (member, zoneId) => {
  if (!member || !zoneId) return 0;
  const savedProgress = member.zoneProgressById?.[zoneId];
  if (member.currentZoneId === zoneId) {
    return clampProgress(member.currentZoneProgress ?? savedProgress);
  }
  return clampProgress(savedProgress);
};

const hasClearedZone = (member, zoneId) =>
  Array.isArray(member?.zonesCleared) && member.zonesCleared.includes(zoneId);

const getActiveQuestId = (mission) =>
  String(
    mission?.questId ??
      mission?.quest?.id ??
      mission?.missionId ??
      mission?.id ??
      "",
  );

const buildActiveMissionSet = (activeMissions) =>
  new Set((activeMissions ?? []).map(getActiveQuestId).filter(Boolean));

const buildZoneMissionMap = (missionList) => {
  const missionMap = new Map();
  (missionList ?? []).forEach((mission) => {
    if (mission?.type === "zone" && mission.zoneId && !missionMap.has(mission.zoneId)) {
      missionMap.set(mission.zoneId, mission);
    }
  });
  return missionMap;
};

const buildProgressRows = (roster, zoneId) =>
  (roster ?? [])
    .map((member) => {
      const progress = getCharacterZoneProgressForZone(member, zoneId);
      const inZone = member?.currentZoneId === zoneId;
      const cleared = hasClearedZone(member, zoneId);
      return {
        member,
        memberId: getMemberId(member),
        name: getMemberName(member),
        role: member?.role,
        className: member?.className ?? member?.class,
        level: Number(member?.level) || 1,
        progress: cleared ? Math.max(progress, 100) : progress,
        inZone,
        cleared,
      };
    })
    .filter((row) => row.inZone || row.cleared || row.progress > 0)
    .sort((a, b) => {
      if (a.inZone !== b.inZone) return a.inZone ? -1 : 1;
      if (a.cleared !== b.cleared) return a.cleared ? -1 : 1;
      if (b.progress !== a.progress) return b.progress - a.progress;
      return a.name.localeCompare(b.name);
    });

export const buildWorldMapZoneSummaries = ({
  roster = [],
  missionList = [],
  activeMissions = [],
  guildFaction = GUILD_FACTION.ALLIANCE,
} = {}) => {
  const activeMissionIds = buildActiveMissionSet(activeMissions);
  const zoneMissionById = buildZoneMissionMap(missionList);

  return ZONE_DEFINITIONS.map((zone) => {
    const progressRows = buildProgressRows(roster, zone.id);
    const heroesInZone = progressRows.filter((row) => row.inZone);
    const guildBestProgress = progressRows.reduce(
      (best, row) => Math.max(best, row.progress),
      0,
    );
    const activeAverageProgress =
      heroesInZone.length > 0
        ? Math.round(
            heroesInZone.reduce((sum, row) => sum + row.progress, 0) /
              heroesInZone.length,
          )
        : 0;
    const eliteQuests = getZoneEliteQuestTemplates(zone.id).map((quest) => ({
      ...quest,
      isActive: activeMissionIds.has(String(quest.id)),
    }));

    return {
      zone,
      zoneMission: zoneMissionById.get(zone.id) ?? null,
      accessible: isZoneAccessibleForFaction(zone, guildFaction),
      heroCount: heroesInZone.length,
      heroesInZone,
      progressRows,
      clearedCount: progressRows.filter((row) => row.cleared).length,
      guildBestProgress,
      activeAverageProgress,
      eliteQuests,
      activeEliteCount: eliteQuests.filter((quest) => quest.isActive).length,
    };
  });
};

export const filterWorldMapZoneSummaries = (
  summaries,
  filter = WORLD_MAP_FILTERS.ACTIVE,
) => {
  switch (filter) {
    case WORLD_MAP_FILTERS.ACTIVE:
      return summaries.filter((summary) => summary.heroCount > 0);
    case WORLD_MAP_FILTERS.AVAILABLE:
      return summaries.filter((summary) => summary.accessible);
    case WORLD_MAP_FILTERS.CLEARED:
      return summaries.filter((summary) => summary.clearedCount > 0);
    case WORLD_MAP_FILTERS.ALL:
    default:
      return [...summaries];
  }
};
