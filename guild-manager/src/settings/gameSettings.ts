export type GameSettingsState = {
  offlineSimulationEnabled: boolean;
};

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettingsState> = Object.freeze({
  offlineSimulationEnabled: true,
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
