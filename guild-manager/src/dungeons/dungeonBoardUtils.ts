import type { Mission } from "../types/missionTypes";
import type { LfgSearch, SocialState } from "../social/chatTypes";

const FORMING_DUNGEON_PHASES = new Set(["guild", "general", "ready"]);

export const getActiveDungeonRunMissions = (activeMissions: readonly Mission[] = []) =>
  (Array.isArray(activeMissions) ? activeMissions : []).filter(
    (mission) => mission?.type === "dungeon" || mission?.isRaid === true,
  );

export const getActiveDungeonRunCount = (activeMissions: readonly Mission[] = []) =>
  getActiveDungeonRunMissions(activeMissions).length;

export const getActiveEliteQuestMissions = (
  activeMissions: readonly Mission[] = [],
) =>
  (Array.isArray(activeMissions) ? activeMissions : []).filter((mission) => {
    if (
      mission?.type === "dungeon" ||
      mission?.type === "raid" ||
      mission?.isRaid === true
    ) {
      return false;
    }

    return (
      mission?.elite === true ||
      mission?.isZoneElite === true ||
      mission?.type === "elite" ||
      String(mission?.typeLabel || "").trim().toLowerCase() === "elite quest"
    );
  });

export const getFormingDungeonSearches = (
  socialState: Pick<SocialState, "searches"> | null | undefined,
): LfgSearch[] =>
  (Array.isArray(socialState?.searches) ? socialState.searches : [])
    .filter(
      (search): search is LfgSearch =>
        search?.missionType === "dungeon" &&
        FORMING_DUNGEON_PHASES.has(search.phase),
    )
    .sort(
      (left, right) =>
        Number(left.createdAt || 0) - Number(right.createdAt || 0),
    );
