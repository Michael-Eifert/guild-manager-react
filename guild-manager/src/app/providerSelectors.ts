import type { Character, Mission } from "./gameTypes";

export type MemberLevelBounds = {
  hasAnyFilter: boolean;
  min: number;
  max: number;
};

export type MissionAchievement = {
  id: string | number;
  name?: string;
  label?: string;
  isRaid: boolean;
  recommended?: number | string;
  minLevel?: number;
  entryLevel?: number;
};

export const getGuildActivityModeSummary = (roster: Character[]) => {
  if (roster.length === 0) return null;
  const firstMode = String(roster[0]?.activityMode || "Auto");
  const uniform = roster.every(
    (member) => String(member?.activityMode || "Auto") === firstMode,
  );
  return uniform ? firstMode : "Mixed";
};

export const getDungeonActivityInfoText = (
  activity: string | undefined,
  modes: { MINIMAL: string; BALANCED: string; ALWAYS: string },
) => {
  if (activity === modes.MINIMAL) return "Groups are formed every other day.";
  if (activity === modes.BALANCED) return "Groups are formed every day.";
  if (activity === modes.ALWAYS) return "Groups will be formed several times a day.";
  return "Automatic dungeon groups are disabled.";
};

export const getMemberLevelBounds = (
  minimumFilter: string,
  maximumFilter: string,
): MemberLevelBounds => {
  const parsedMinimum = Number(minimumFilter);
  const parsedMaximum = Number(maximumFilter);
  const hasMinimum = minimumFilter !== "" && Number.isFinite(parsedMinimum) && parsedMinimum > 0;
  const hasMaximum = maximumFilter !== "" && Number.isFinite(parsedMaximum) && parsedMaximum > 0;
  const normalizedMinimum = hasMinimum ? Math.max(1, Math.floor(parsedMinimum)) : null;
  const normalizedMaximum = hasMaximum ? Math.max(1, Math.floor(parsedMaximum)) : null;

  if (normalizedMinimum !== null && normalizedMaximum !== null) {
    return {
      hasAnyFilter: true,
      min: Math.min(normalizedMinimum, normalizedMaximum),
      max: Math.max(normalizedMinimum, normalizedMaximum),
    };
  }
  return {
    hasAnyFilter: hasMinimum || hasMaximum,
    min: normalizedMinimum ?? 1,
    max: normalizedMaximum ?? Number.POSITIVE_INFINITY,
  };
};

export const rankGuildRoster = ({
  roster,
  levelBounds,
  sortMode,
  sortModes,
  normalizedSearch,
  getItemLevel,
  getSearchScore,
}: {
  roster: Character[];
  levelBounds: MemberLevelBounds;
  sortMode: string;
  sortModes: { LEVEL_ASC: string; ILVL_DESC: string; ILVL_ASC: string };
  normalizedSearch: string;
  getItemLevel: (character: Character) => number;
  getSearchScore: (character: Character, search: string) => number;
}) => {
  const filteredRoster = levelBounds.hasAnyFilter
    ? roster.filter((member) => {
        const level = Number(member?.level) || 1;
        return level >= levelBounds.min && level <= levelBounds.max;
      })
    : roster;

  const sortedRoster = [...filteredRoster].sort((left, right) => {
    const leftLevel = Number(left?.level) || 1;
    const rightLevel = Number(right?.level) || 1;
    const leftItemLevel = getItemLevel(left);
    const rightItemLevel = getItemLevel(right);

    if (sortMode === sortModes.LEVEL_ASC) {
      if (leftLevel !== rightLevel) return leftLevel - rightLevel;
      if (rightItemLevel !== leftItemLevel) return rightItemLevel - leftItemLevel;
    } else if (sortMode === sortModes.ILVL_DESC) {
      if (rightItemLevel !== leftItemLevel) return rightItemLevel - leftItemLevel;
      if (rightLevel !== leftLevel) return rightLevel - leftLevel;
    } else if (sortMode === sortModes.ILVL_ASC) {
      if (leftItemLevel !== rightItemLevel) return leftItemLevel - rightItemLevel;
      if (leftLevel !== rightLevel) return leftLevel - rightLevel;
    } else {
      if (rightLevel !== leftLevel) return rightLevel - leftLevel;
      if (rightItemLevel !== leftItemLevel) return rightItemLevel - leftItemLevel;
    }
    return String(left?.name || "").localeCompare(String(right?.name || ""));
  });

  if (!normalizedSearch) return sortedRoster;
  return sortedRoster
    .map((member, index) => ({ member, index, score: getSearchScore(member, normalizedSearch) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ member }) => member);
};

export const buildMissionAchievementCatalog = (missions: Mission[]): MissionAchievement[] =>
  [...missions]
    .filter((mission) => mission?.type === "dungeon")
    .sort((left, right) => {
      if ((left?.level || 0) !== (right?.level || 0)) return (left?.level || 0) - (right?.level || 0);
      return String(left?.name || "").localeCompare(String(right?.name || ""));
    })
    .map((mission) => ({
      id: mission.id,
      name: mission.name,
      label:
        mission.dungeonWing && mission.dungeonSetName
          ? `${mission.dungeonWing} (${mission.dungeonSetName})`
          : mission.dungeonWing || mission.name,
      isRaid: mission.isRaid === true,
      recommended: mission.recommended,
      minLevel: mission.minLevel,
      entryLevel: mission.entryLevel,
    }));
