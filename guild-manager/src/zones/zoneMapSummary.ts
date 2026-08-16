import { GUILD_FACTION } from "../constants";
import {
  ZONE_DEFINITIONS,
  getZoneEliteQuestTemplates,
  isZoneAccessibleForFaction,
  isZoneAvailableInContent,
} from "./zoneDefinitions";
import { CONTENT_PHASE, type ContentPhase } from "../content/contentRules";
import type { Character } from "../types/characterTypes";
import type { Mission } from "../types/missionTypes";

export const WORLD_MAP_FILTERS = Object.freeze({
  ACTIVE: "Active",
  AVAILABLE: "Available",
  CLEARED: "Cleared",
  ALL: "All",
});

type ZoneDefinition = (typeof ZONE_DEFINITIONS)[number];
type WorldMapFilter =
  typeof WORLD_MAP_FILTERS[keyof typeof WORLD_MAP_FILTERS];
type ActiveZoneElite = {
  zoneId: string;
  questId: string;
  missionName: string;
};
type ZoneProgressRow = {
  member: Character;
  memberId: string;
  name: string;
  race?: string;
  gender?: string;
  role?: string;
  charClass?: string;
  className?: string;
  level: number;
  progress: number;
  inZone: boolean;
  isGroupQuesting: boolean;
  activeZoneEliteName: string | null;
  cleared: boolean;
};
export type WorldMapZoneSummary = {
  zone: ZoneDefinition;
  zoneMission: Mission | null;
  accessible: boolean;
  heroCount: number;
  heroesInZone: ZoneProgressRow[];
  progressRows: ZoneProgressRow[];
  clearedCount: number;
  guildBestProgress: number;
  activeAverageProgress: number;
  eliteQuests: Array<Mission & { isActive: boolean }>;
  activeEliteCount: number;
};

const clampProgress = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const getMemberId = (member: Character) => member.id ?? member.name ?? "";

const getMemberName = (member: Character) => member.name ?? "Unknown Hero";

export const getCharacterZoneProgressForZone = (
  member: Character | null | undefined,
  zoneId: string,
) => {
  if (!member || !zoneId) return 0;
  const savedProgress = member.zoneProgressById?.[zoneId];
  if (member.currentZoneId === zoneId) {
    return clampProgress(member.currentZoneProgress ?? savedProgress);
  }
  return clampProgress(savedProgress);
};

const hasClearedZone = (member: Character, zoneId: string) =>
  Array.isArray(member?.zonesCleared) && member.zonesCleared.includes(zoneId);

const getActiveQuestId = (mission: Mission) =>
  String(
    mission?.questId ??
      mission?.quest?.id ??
      mission?.missionId ??
      mission?.id ??
      "",
  );

const buildActiveMissionSet = (activeMissions: Mission[]) =>
  new Set((activeMissions ?? []).map(getActiveQuestId).filter(Boolean));

const buildActiveZoneEliteMemberMap = (activeMissions: Mission[]) => {
  const memberMap = new Map<string, ActiveZoneElite>();
  (Array.isArray(activeMissions) ? activeMissions : []).forEach((mission) => {
    if (mission?.isZoneElite !== true) return;
    const zoneId = String(mission?.zoneId || "").trim();
    if (!zoneId) return;
    const questId = getActiveQuestId(mission);
    (Array.isArray(mission?.memberIds) ? mission.memberIds : []).forEach(
      (memberId) => {
        const normalizedMemberId = String(memberId || "").trim();
        if (!normalizedMemberId) return;
        memberMap.set(normalizedMemberId, {
          zoneId,
          questId,
          missionName: mission?.name || "Zone Elite",
        });
      },
    );
  });
  return memberMap;
};

const buildZoneMissionMap = (missionList: Mission[]) => {
  const missionMap = new Map<string, Mission>();
  (missionList ?? []).forEach((mission) => {
    if (mission?.type === "zone" && mission.zoneId && !missionMap.has(mission.zoneId)) {
      missionMap.set(mission.zoneId, mission);
    }
  });
  return missionMap;
};

const buildProgressRows = (
  roster: Character[],
  zoneId: string,
  activeZoneEliteByMemberId: Map<string, ActiveZoneElite>,
): ZoneProgressRow[] =>
  (roster ?? [])
    .map((member) => {
      const memberId = getMemberId(member);
      const progress = getCharacterZoneProgressForZone(member, zoneId);
      const inZone = member?.currentZoneId === zoneId;
      const cleared = hasClearedZone(member, zoneId);
      const activeZoneElite = activeZoneEliteByMemberId.get(String(memberId || ""));
      const isGroupQuesting =
        inZone && activeZoneElite?.zoneId === zoneId;
      return {
        member,
        memberId,
        name: getMemberName(member),
        race: member?.race,
        gender: member?.gender,
        role: member?.role,
        charClass: member?.charClass ?? member?.className ?? member?.class,
        className: member?.charClass ?? member?.className ?? member?.class,
        level: Number(member?.level) || 1,
        progress: cleared ? Math.max(progress, 100) : progress,
        inZone,
        isGroupQuesting,
        activeZoneEliteName: isGroupQuesting
          ? activeZoneElite.missionName
          : null,
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
  contentPhase = CONTENT_PHASE.CLASSIC,
}: {
  roster?: Character[];
  missionList?: Mission[];
  activeMissions?: Mission[];
  guildFaction?: string;
  contentPhase?: ContentPhase;
} = {}): WorldMapZoneSummary[] => {
  const activeMissionIds = buildActiveMissionSet(activeMissions);
  const activeZoneEliteByMemberId = buildActiveZoneEliteMemberMap(activeMissions);
  const zoneMissionById = buildZoneMissionMap(missionList);

  return ZONE_DEFINITIONS.filter((zone) =>
    isZoneAvailableInContent(zone, contentPhase),
  ).map((zone) => {
    const progressRows = buildProgressRows(
      roster,
      zone.id,
      activeZoneEliteByMemberId,
    );
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
    const eliteQuests = (getZoneEliteQuestTemplates(
      zone.id,
      1,
      contentPhase,
    ) as Mission[]).map(
      (quest) => ({
        ...quest,
        isActive: activeMissionIds.has(String(quest.id)),
      }),
    );

    return {
      zone,
      zoneMission: zoneMissionById.get(zone.id) ?? null,
      accessible: isZoneAccessibleForFaction(
        zone,
        guildFaction,
        contentPhase,
      ),
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
  summaries: WorldMapZoneSummary[],
  filter: WorldMapFilter = WORLD_MAP_FILTERS.ACTIVE,
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
