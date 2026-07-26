import {
  DEFAULT_GUILD_SETUP,
  AUTO_GROUP_SUCCESS_RATE,
  GUILD_DUNGEON_ACTIVITY_OPTIONS,
  GUILD_FACTION,
  GUILD_FACTION_OPTIONS,
  GUILD_FOCUS,
  GUILD_FOCUS_OPTIONS,
  GUILD_SERVER_OPTIONS,
  normalizeRealmDifficulty,
} from "../constants";
import { normalizePvpActivityFocus } from "../pvp/battlefields/battlefieldUtils";
import { normalizeFounderConfig } from "../guildRelations/founderCreation";

type GuildSetupInput = Record<string, unknown>;
type SessionSetupPayload = {
  roster?: unknown[];
  activeMissions?: unknown[];
  guildGold?: unknown;
};
const includesString = (values: readonly string[], value: string) =>
  values.includes(value);

export const getFactionDefaultGuildName = (faction: string) =>
  faction === GUILD_FACTION.HORDE ? "Horde Vanguard" : "Alliance Vanguard";

export const getFactionFallbackManagerName = (faction: string) =>
  faction === GUILD_FACTION.HORDE ? "Horde Manager" : "Alliance Manager";

const getServerOptionByValue = (serverValue: string) =>
  GUILD_SERVER_OPTIONS.find((option) => option.value === serverValue) ||
  GUILD_SERVER_OPTIONS[0];

export const getGuildServerStyle = (serverValue: string) =>
  getServerOptionByValue(serverValue)?.style || DEFAULT_GUILD_SETUP.serverStyle;

export const getGuildServerPopulation = (serverValue: string) =>
  getServerOptionByValue(serverValue)?.population ||
  DEFAULT_GUILD_SETUP.serverPopulation;

export const getGuildServerLabel = (
  serverValue: string,
  serverStyle?: string,
) => {
  const option = getServerOptionByValue(serverValue);
  const resolvedStyle =
    serverStyle || option?.style || DEFAULT_GUILD_SETUP.serverStyle;
  const resolvedServer =
    serverValue || option?.value || DEFAULT_GUILD_SETUP.server;
  return `${resolvedServer} (${resolvedStyle})`;
};

export const normalizeAutoGroupSuccessRate = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return AUTO_GROUP_SUCCESS_RATE.DEFAULT;
  return Math.max(
    AUTO_GROUP_SUCCESS_RATE.MIN,
    Math.min(AUTO_GROUP_SUCCESS_RATE.MAX, Math.round(numeric)),
  );
};

export const normalizeGuildSetup = (
  value: unknown,
  payloadData: SessionSetupPayload = {},
) => {
  const safe: GuildSetupInput =
    value && typeof value === "object" ? (value as GuildSetupInput) : {};
  const hasLegacyGameData =
    (Array.isArray(payloadData?.roster) && payloadData.roster.length > 0) ||
    (Array.isArray(payloadData?.activeMissions) &&
      payloadData.activeMissions.length > 0) ||
    Number(payloadData?.guildGold) > 0;

  const normalizedName = String(safe.name || "").trim();
  const faction = String(safe.faction || "");
  const focus = String(safe.focus || "");
  const dungeonActivity = String(safe.dungeonActivity || "");
  const server = String(safe.server || "");
  const normalizedFaction = includesString(GUILD_FACTION_OPTIONS, faction)
    ? faction
    : GUILD_FACTION.ALLIANCE;
  const normalizedFocus = includesString(GUILD_FOCUS_OPTIONS, focus)
    ? focus
    : GUILD_FOCUS.LEVELING;
  const normalizedDungeonActivity = includesString(
    GUILD_DUNGEON_ACTIVITY_OPTIONS,
    dungeonActivity,
  )
    ? dungeonActivity
    : DEFAULT_GUILD_SETUP.dungeonActivity;
  const normalizedServer = GUILD_SERVER_OPTIONS.some(
    (option) => option.value === server,
  )
    ? server
    : DEFAULT_GUILD_SETUP.server;
  const normalizedServerStyle = getGuildServerStyle(normalizedServer);
  const normalizedServerPopulation = getGuildServerPopulation(normalizedServer);

  const hasStarted = Boolean(
    safe.hasStarted || normalizedName || hasLegacyGameData,
  );

  return {
    ...DEFAULT_GUILD_SETUP,
    name:
      normalizedName ||
      (hasStarted
        ? getFactionDefaultGuildName(normalizedFaction)
        : DEFAULT_GUILD_SETUP.name),
    faction: normalizedFaction,
    server: normalizedServer,
    serverStyle: normalizedServerStyle,
    serverPopulation: normalizedServerPopulation,
    realmDifficulty: normalizeRealmDifficulty(safe.realmDifficulty),
    focus: normalizedFocus,
    lastFocusChangeDayIndex: Number.isFinite(
      Number(safe.lastFocusChangeDayIndex),
    )
      ? Number(safe.lastFocusChangeDayIndex)
      : null,
    dungeonActivity: normalizedDungeonActivity,
    pvpActivityFocus: normalizePvpActivityFocus(safe.pvpActivityFocus),
    eliteQuestMinSuccessChance: normalizeAutoGroupSuccessRate(
      safe.eliteQuestMinSuccessChance,
    ),
    dungeonMinSuccessChance: normalizeAutoGroupSuccessRate(
      safe.dungeonMinSuccessChance,
    ),
    founder: normalizeFounderConfig(safe.founder, normalizedFaction),
    hasStarted,
  };
};

export const getGuildFocusBonuses = (focus: unknown) => {
  if (focus === GUILD_FOCUS.LEVELING) {
    return {
      expMultiplier: 1.05,
      dungeonSuccessBonus: 0,
      fullPartyGoldMultiplier: 1,
    };
  }
  if (focus === GUILD_FOCUS.DUNGEONS) {
    return {
      expMultiplier: 1,
      dungeonSuccessBonus: 5,
      fullPartyGoldMultiplier: 1,
    };
  }
  if (focus === GUILD_FOCUS.SOCIAL) {
    return {
      expMultiplier: 1,
      dungeonSuccessBonus: 0,
      fullPartyGoldMultiplier: 1.05,
    };
  }
  return {
    expMultiplier: 1,
    dungeonSuccessBonus: 0,
    fullPartyGoldMultiplier: 1,
  };
};
