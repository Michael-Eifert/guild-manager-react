export type GameSettingsState = {
  offlineSimulationEnabled: boolean;
  realmGuildDensity: RealmGuildDensity;
  realmGuildDynamics: RealmGuildDynamics;
  officerAutonomyMode: OfficerAutonomyMode;
};

export const OFFICER_AUTONOMY_MODES = ["off", "proposals", "automatic"] as const;
export type OfficerAutonomyMode = typeof OFFICER_AUTONOMY_MODES[number];

export const OFFICER_AUTONOMY_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: "off" as const, label: "Off" }),
  Object.freeze({ value: "proposals" as const, label: "Proposals" }),
  Object.freeze({ value: "automatic" as const, label: "Automatic" }),
]);

export const REALM_GUILD_DENSITIES = ["few", "medium", "many"] as const;
export type RealmGuildDensity = typeof REALM_GUILD_DENSITIES[number];

export const REALM_GUILD_DYNAMICS = ["low", "medium", "high"] as const;
export type RealmGuildDynamics = typeof REALM_GUILD_DYNAMICS[number];

export const REALM_GUILD_DENSITY_OPTIONS = Object.freeze([
  Object.freeze({ value: "few" as const, label: "Few" }),
  Object.freeze({ value: "medium" as const, label: "Medium" }),
  Object.freeze({ value: "many" as const, label: "Many" }),
]);

export const REALM_GUILD_DYNAMICS_OPTIONS = Object.freeze([
  Object.freeze({ value: "low" as const, label: "Low" }),
  Object.freeze({ value: "medium" as const, label: "Medium" }),
  Object.freeze({ value: "high" as const, label: "High" }),
]);

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettingsState> = Object.freeze({
  offlineSimulationEnabled: false,
  realmGuildDensity: "medium",
  realmGuildDynamics: "medium",
  officerAutonomyMode: "automatic",
});

export const normalizeGameSettings = (
  value: unknown,
): GameSettingsState => {
  const input =
    value && typeof value === "object"
      ? (value as Partial<GameSettingsState>)
      : {};

  return {
    offlineSimulationEnabled:
      typeof input.offlineSimulationEnabled === "boolean"
        ? input.offlineSimulationEnabled
        : DEFAULT_GAME_SETTINGS.offlineSimulationEnabled,
    realmGuildDensity: REALM_GUILD_DENSITIES.includes(
      input.realmGuildDensity as RealmGuildDensity,
    )
      ? (input.realmGuildDensity as RealmGuildDensity)
      : DEFAULT_GAME_SETTINGS.realmGuildDensity,
    realmGuildDynamics: REALM_GUILD_DYNAMICS.includes(
      input.realmGuildDynamics as RealmGuildDynamics,
    )
      ? (input.realmGuildDynamics as RealmGuildDynamics)
      : DEFAULT_GAME_SETTINGS.realmGuildDynamics,
    officerAutonomyMode: OFFICER_AUTONOMY_MODES.includes(
      input.officerAutonomyMode as OfficerAutonomyMode,
    )
      ? (input.officerAutonomyMode as OfficerAutonomyMode)
      : DEFAULT_GAME_SETTINGS.officerAutonomyMode,
  };
};

export const clearPersistedOfflineStatuses = <
  T extends { status?: unknown; statusText?: unknown },
>(
  characters: T[],
): T[] =>
  characters.map((character) => {
    if (character.status !== "Offline") return character;
    const staleScheduleText = String(character.statusText || "").startsWith(
      "Next login:",
    );
    return {
      ...character,
      status: "Idle",
      ...(staleScheduleText ? { statusText: "Awaiting Orders" } : {}),
    };
  });
