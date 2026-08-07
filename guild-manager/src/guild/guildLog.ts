export const GUILD_LOG_ALL_LIMIT = 100;
export const GUILD_LOG_SCENARIO_LIMIT = 50;

export type GuildLogScenario = "world" | "dungeon" | "raid" | "pvp";
export type GuildLogFilter = "all" | GuildLogScenario;

type MissionLike = {
  name?: string;
  isRaid?: boolean;
  type?: string;
};

export type GuildLogEntryLike = {
  type?: string;
  missionName?: string;
};

export type GuildLogEntryWithScenario<T extends GuildLogEntryLike> = {
  log: T;
  scenario: GuildLogScenario | null;
};

const LOG_SCENARIOS: GuildLogScenario[] = [
  "world",
  "dungeon",
  "raid",
  "pvp",
];

const normalizeLogSourceName = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^zone:\s*/i, "")
    .toLowerCase();

const getMissionScenario = (
  mission: MissionLike,
): GuildLogScenario | null => {
  if (!mission) return null;
  if (mission.isRaid === true) return "raid";
  if (mission.type === "dungeon") return "dungeon";
  if (mission.type === "quest" || mission.type === "zone") return "world";
  return null;
};

export const buildMissionScenarioLookup = (
  missionList: MissionLike[],
) =>
  (Array.isArray(missionList) ? missionList : []).reduce<
    Map<string, GuildLogScenario>
  >((lookup, mission) => {
    const scenario = getMissionScenario(mission);
    if (!scenario) return lookup;

    const names = [mission.name];
    if (mission.type === "zone" && mission.name?.startsWith("Zone: ")) {
      names.push(mission.name.replace(/^Zone:\s*/i, ""));
    }

    names.forEach((name) => {
      const key = normalizeLogSourceName(name);
      if (key) lookup.set(key, scenario);
    });

    return lookup;
  }, new Map());

export const getGuildLogScenario = (
  log: GuildLogEntryLike,
  missionScenarioLookup: Map<string, GuildLogScenario>,
): GuildLogScenario | null => {
  if (log?.type === "calendar") return "raid";
  if (log?.type === "pvp") return "pvp";
  if (log?.type === "zone-clear" || log?.type === "zone-gold") return "world";
  if (log?.missionName === "World Drop") return "world";

  const missionKey = normalizeLogSourceName(log?.missionName);
  return missionKey ? missionScenarioLookup.get(missionKey) || null : null;
};

export const mapGuildLogsToScenarios = <T extends GuildLogEntryLike>(
  logs: T[],
  missionList: MissionLike[],
): GuildLogEntryWithScenario<T>[] => {
  const missionScenarioLookup = buildMissionScenarioLookup(missionList);
  return (Array.isArray(logs) ? logs : []).map((log) => ({
    log,
    scenario: getGuildLogScenario(log, missionScenarioLookup),
  }));
};

export const getVisibleGuildLogEntries = <T extends GuildLogEntryLike>(
  logs: T[],
  missionList: MissionLike[],
  filter: GuildLogFilter,
): GuildLogEntryWithScenario<T>[] => {
  const entries = mapGuildLogsToScenarios(logs, missionList);
  if (filter === "all") return entries.slice(0, GUILD_LOG_ALL_LIMIT);
  return entries
    .filter((entry) => entry.scenario === filter)
    .slice(0, GUILD_LOG_SCENARIO_LIMIT);
};

export const retainGuildLogEntries = <T extends GuildLogEntryLike>(
  logs: T[],
  missionList: MissionLike[],
): T[] => {
  const entries = mapGuildLogsToScenarios(logs, missionList);
  const scenarioCounts = LOG_SCENARIOS.reduce<Record<GuildLogScenario, number>>(
    (counts, scenario) => {
      counts[scenario] = 0;
      return counts;
    },
    { world: 0, dungeon: 0, raid: 0, pvp: 0 },
  );

  return entries
    .filter((entry, index) => {
      const keepForAll = index < GUILD_LOG_ALL_LIMIT;
      if (!entry.scenario) return keepForAll;

      const keepForScenario =
        scenarioCounts[entry.scenario] < GUILD_LOG_SCENARIO_LIMIT;
      if (keepForScenario) scenarioCounts[entry.scenario] += 1;
      return keepForAll || keepForScenario;
    })
    .map((entry) => entry.log);
};

export const clearGuildLogEntries = <T extends GuildLogEntryLike>(
  logs: T[],
  missionList: MissionLike[],
  filter: GuildLogFilter,
): T[] => {
  if (filter === "all") return [];
  return mapGuildLogsToScenarios(logs, missionList)
    .filter((entry) => entry.scenario !== filter)
    .map((entry) => entry.log);
};
