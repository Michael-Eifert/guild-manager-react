import { INITIAL_MISSIONS } from "../data/gameConfig";
import type { Mission } from "../types/missionTypes";
import { getMissionListWithZones } from "../zones/zoneLogic";
import {
  cloneMissionTemplate,
  mergeCanonicalMissionTemplates,
} from "./missionTemplates";

const getCanonicalMissionTemplates = () =>
  INITIAL_MISSIONS.map(cloneMissionTemplate);

export const getMissionListForContent = (
  missionList: readonly Mission[] | null | undefined = null,
  contentPhase = "classic",
) => {
  const merged = mergeCanonicalMissionTemplates(
    missionList,
    getCanonicalMissionTemplates(),
  );
  return getMissionListWithZones(merged, contentPhase);
};
