import {
  DEFAULT_GUILD_SETUP,
  AUTO_GROUP_SUCCESS_RATE,
  GUILD_DUNGEON_ACTIVITY,
  GUILD_DUNGEON_ACTIVITY_OPTIONS,
  GUILD_FACTION,
  GUILD_FACTION_OPTIONS,
  GUILD_FOCUS,
  GUILD_FOCUS_OPTIONS,
  GUILD_SERVER_OPTIONS,
} from "../constants";

export const getFactionDefaultGuildName = (faction) =>
  faction === GUILD_FACTION.HORDE ? "Horde Vanguard" : "Alliance Vanguard";

export const getFactionFallbackManagerName = (faction) =>
  faction === GUILD_FACTION.HORDE ? "Horde Manager" : "Alliance Manager";

const getServerOptionByValue = (serverValue) =>
  GUILD_SERVER_OPTIONS.find((option) => option.value === serverValue) ||
  GUILD_SERVER_OPTIONS[0];

export const getGuildServerStyle = (serverValue) =>
  getServerOptionByValue(serverValue)?.style || DEFAULT_GUILD_SETUP.serverStyle;

export const getGuildServerPopulation = (serverValue) =>
  getServerOptionByValue(serverValue)?.population ||
  DEFAULT_GUILD_SETUP.serverPopulation;

export const getGuildServerLabel = (serverValue, serverStyle) => {
  const option = getServerOptionByValue(serverValue);
  const resolvedStyle =
    serverStyle || option?.style || DEFAULT_GUILD_SETUP.serverStyle;
  const resolvedServer =
    serverValue || option?.value || DEFAULT_GUILD_SETUP.server;
  return `${resolvedServer} (${resolvedStyle})`;
};

export const normalizeAutoGroupSuccessRate = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return AUTO_GROUP_SUCCESS_RATE.DEFAULT;
  return Math.max(
    AUTO_GROUP_SUCCESS_RATE.MIN,
    Math.min(AUTO_GROUP_SUCCESS_RATE.MAX, Math.round(numeric)),
  );
};

export const normalizeGuildSetup = (value, payloadData = {}) => {
  const safe = value && typeof value === "object" ? value : {};
  const hasLegacyGameData =
    (Array.isArray(payloadData?.roster) && payloadData.roster.length > 0) ||
    (Array.isArray(payloadData?.activeMissions) &&
      payloadData.activeMissions.length > 0) ||
    Number(payloadData?.guildGold) > 0;

  const normalizedName = String(safe.name || "").trim();
  const normalizedFaction = GUILD_FACTION_OPTIONS.includes(safe.faction)
    ? safe.faction
    : GUILD_FACTION.ALLIANCE;
  const normalizedFocus = GUILD_FOCUS_OPTIONS.includes(safe.focus)
    ? safe.focus
    : GUILD_FOCUS.LEVELING;
  const normalizedDungeonActivity = GUILD_DUNGEON_ACTIVITY_OPTIONS.includes(
    safe.dungeonActivity,
  )
    ? safe.dungeonActivity
    : GUILD_DUNGEON_ACTIVITY.NONE;
  const normalizedServer = GUILD_SERVER_OPTIONS.some(
    (option) => option.value === safe.server,
  )
    ? safe.server
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
    focus: normalizedFocus,
    lastFocusChangeDayIndex: Number.isFinite(
      Number(safe.lastFocusChangeDayIndex),
    )
      ? Number(safe.lastFocusChangeDayIndex)
      : null,
    dungeonActivity: normalizedDungeonActivity,
    eliteQuestMinSuccessChance: normalizeAutoGroupSuccessRate(
      safe.eliteQuestMinSuccessChance,
    ),
    dungeonMinSuccessChance: normalizeAutoGroupSuccessRate(
      safe.dungeonMinSuccessChance,
    ),
    hasStarted,
  };
};

export const getGuildFocusBonuses = (focus) => {
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
