import type { ContentPhase } from "../content/contentRules";
import type { Mission } from "../types/missionTypes";
import {
  getZoneById,
  isZoneAccessibleForFaction,
} from "../zones/zoneDefinitions";

export const isMissionAccessibleForGuild = (
  mission: Mission | null | undefined,
  guildFaction: unknown,
  contentPhase: ContentPhase | string = "classic",
) => {
  if (!mission) return false;

  const requiredFaction = String(mission.requiredFaction || "").trim();
  if (requiredFaction && requiredFaction !== String(guildFaction || "")) {
    return false;
  }

  const zoneId = String(mission.zoneId || "").trim();
  if (!zoneId) return true;

  const zone = getZoneById(
    zoneId,
    Number(mission.level) || 1,
    contentPhase,
  );
  return isZoneAccessibleForFaction(zone, guildFaction, contentPhase);
};
