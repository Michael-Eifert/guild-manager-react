import type { StashPolicy } from "../inventory/itemEvaluation";
import type { GuildInventory } from "../types/itemTypes";
import type { SocialState } from "../social/chatTypes";
import type { GuildRelationsState } from "../guildRelations/guildRelations";
import type { GuildActivityStats } from "../guild/guildActivityStats";
import type { GameSettingsState } from "../settings/gameSettings";

type StateRef<T> = { current: T };
type UnknownRecord = Record<string, unknown>;
export type LoadedSession = {
  normalizedRoster: UnknownRecord[];
  loadedActiveMissions: unknown[];
  loadedMissionList: unknown[];
  loadedGuildLog: unknown[];
  loadedGuildProgress: Record<string, unknown>;
  loadedGuildGold: number;
  loadedGuildSetup: UnknownRecord & { faction?: string };
  loadedGuildRelationships: Record<string, unknown>;
  loadedRealmState: Record<string, unknown> | null;
  loadedWorldPvpState: Record<string, unknown>;
  loadedBattlefieldState: Record<string, unknown>;
  loadedGuildInventory: GuildInventory;
  loadedStashPolicy: StashPolicy;
  loadedMissionBoardState: Record<string, unknown>;
  loadedSocialState: SocialState;
  loadedGuildRelationsState: GuildRelationsState;
  loadedGuildActivityStats: GuildActivityStats;
  loadedGameSettings: GameSettingsState;
  loadedProgression: {
    gameTimeMs: number;
    isPaused: boolean;
    gameSpeed: number;
  };
  loadedCalendarState: Record<string, unknown>;
  loadedRaidLockouts: Record<string, unknown>;
};
export type SessionRefs = {
  rewardedMissionIds: StateRef<Set<string>>;
  roster: StateRef<UnknownRecord[]>;
  missions: StateRef<unknown[]>;
  gold: StateRef<number>;
  guildProgress: StateRef<Record<string, unknown>>;
  guildSetup: StateRef<Record<string, unknown>>;
  guildRelationships?: StateRef<Record<string, unknown>>;
  realmState?: StateRef<Record<string, unknown> | null>;
  worldPvpState?: StateRef<Record<string, unknown>>;
  battlefieldState?: StateRef<Record<string, unknown>>;
  guildInventory?: StateRef<GuildInventory>;
  stashPolicy?: StateRef<StashPolicy>;
  calendarState: StateRef<Record<string, unknown>>;
  raidLockouts?: StateRef<Record<string, unknown>>;
  socialState?: StateRef<SocialState>;
  guildRelationsState?: StateRef<GuildRelationsState>;
  guildActivityStats?: StateRef<GuildActivityStats>;
  gameSettings?: StateRef<GameSettingsState>;
  gameTime: StateRef<number>;
  lastRealTime: StateRef<number>;
  sessionFileInput: StateRef<HTMLInputElement | null>;
};
type StateSetter = (value: unknown) => void;
export type SessionSetters = {
  setRoster: StateSetter;
  setActiveMissions: StateSetter;
  setMissionList: StateSetter;
  setGuildLog: StateSetter;
  setGuildGold: StateSetter;
  setGuildProgress: StateSetter;
  setGuildSetup: StateSetter;
  setGuildRelationships?: StateSetter;
  setRealmState?: StateSetter;
  setWorldPvpState?: StateSetter;
  setBattlefieldState?: StateSetter;
  setGuildInventory?: StateSetter;
  setStashPolicy?: StateSetter;
  setMissionBoardState?: StateSetter;
  setCalendarState: StateSetter;
  setRaidLockouts?: StateSetter;
  setSocialState?: StateSetter;
  setGuildRelationsState?: StateSetter;
  setGuildActivityStats?: StateSetter;
  setGameSettings?: StateSetter;
  setIsPaused: StateSetter;
  setGameSpeed: StateSetter;
  setGameTimeMs: StateSetter;
  setDetailCharId: StateSetter;
};

export const applyLoadedSessionToApp = ({
  loadedSession,
  factionFallback,
  normalizeRosterZones,
  getMissionListWithZones,
  clampGameSpeed,
  refs,
  setters,
  closeOverlays,
  getCurrentTime = Date.now,
}: {
  loadedSession: LoadedSession;
  factionFallback: string;
  normalizeRosterZones: (
    roster: UnknownRecord[],
    faction?: string,
    contentPhase?: string,
  ) => UnknownRecord[];
  getMissionListWithZones: (
    missions: unknown[],
    contentPhase?: string,
  ) => unknown[];
  clampGameSpeed: (speed: number) => number;
  refs: SessionRefs;
  setters: SessionSetters;
  closeOverlays: () => void;
  getCurrentTime?: () => number;
}) => {
  const {
    normalizedRoster,
    loadedActiveMissions,
    loadedMissionList,
    loadedGuildLog,
    loadedGuildProgress,
    loadedGuildGold,
    loadedGuildSetup,
    loadedGuildRelationships,
    loadedRealmState,
    loadedWorldPvpState,
    loadedBattlefieldState,
    loadedGuildInventory,
    loadedStashPolicy,
    loadedMissionBoardState,
    loadedSocialState,
    loadedGuildRelationsState,
    loadedGuildActivityStats,
    loadedGameSettings,
    loadedProgression,
    loadedCalendarState,
    loadedRaidLockouts,
  } = loadedSession;
  const zoneReadyRoster = normalizeRosterZones(
    normalizedRoster,
    loadedGuildSetup?.faction || factionFallback,
    String(loadedGuildSetup?.contentPhase || "classic"),
  );

  refs.rewardedMissionIds.current = new Set();
  refs.roster.current = zoneReadyRoster;
  refs.missions.current = loadedActiveMissions;
  refs.gold.current = loadedGuildGold;
  refs.guildProgress.current = loadedGuildProgress;
  refs.guildSetup.current = loadedGuildSetup;
  if (refs.guildRelationships) refs.guildRelationships.current = loadedGuildRelationships || {};
  if (refs.realmState) refs.realmState.current = loadedRealmState || null;
  if (refs.worldPvpState) refs.worldPvpState.current = loadedWorldPvpState || {};
  if (refs.battlefieldState) refs.battlefieldState.current = loadedBattlefieldState || {};
  if (refs.guildInventory) refs.guildInventory.current = loadedGuildInventory || { items: {} };
  if (refs.stashPolicy) refs.stashPolicy.current = loadedStashPolicy || {};
  refs.calendarState.current = loadedCalendarState;
  if (refs.raidLockouts) refs.raidLockouts.current = loadedRaidLockouts || {};
  if (refs.socialState) refs.socialState.current = loadedSocialState;
  if (refs.guildRelationsState) {
    refs.guildRelationsState.current = loadedGuildRelationsState;
  }
  if (refs.guildActivityStats) refs.guildActivityStats.current = loadedGuildActivityStats;
  if (refs.gameSettings) refs.gameSettings.current = loadedGameSettings;
  refs.gameTime.current = loadedProgression.gameTimeMs;
  refs.lastRealTime.current = getCurrentTime();

  setters.setRoster(zoneReadyRoster);
  setters.setActiveMissions(loadedActiveMissions);
  setters.setMissionList(
    getMissionListWithZones(
      loadedMissionList,
      String(loadedGuildSetup?.contentPhase || "classic"),
    ),
  );
  setters.setGuildLog(loadedGuildLog);
  setters.setGuildGold(loadedGuildGold);
  setters.setGuildProgress(loadedGuildProgress);
  setters.setGuildSetup(loadedGuildSetup);
  if (setters.setGuildRelationships) {
    setters.setGuildRelationships(loadedGuildRelationships || {});
  }
  if (setters.setRealmState) setters.setRealmState(loadedRealmState || null);
  if (setters.setWorldPvpState) setters.setWorldPvpState(loadedWorldPvpState || {});
  if (setters.setBattlefieldState) {
    setters.setBattlefieldState(loadedBattlefieldState || {});
  }
  if (setters.setGuildInventory) {
    setters.setGuildInventory(loadedGuildInventory || { items: {} });
  }
  if (setters.setStashPolicy) {
    setters.setStashPolicy(loadedStashPolicy || {});
  }
  if (setters.setMissionBoardState) {
    setters.setMissionBoardState(loadedMissionBoardState);
  }
  setters.setCalendarState(loadedCalendarState);
  if (setters.setRaidLockouts) setters.setRaidLockouts(loadedRaidLockouts || {});
  if (setters.setSocialState) {
    setters.setSocialState(loadedSocialState || {});
  }
  if (setters.setGuildRelationsState) {
    setters.setGuildRelationsState(loadedGuildRelationsState);
  }
  if (setters.setGuildActivityStats) {
    setters.setGuildActivityStats(loadedGuildActivityStats);
  }
  if (setters.setGameSettings) {
    setters.setGameSettings(loadedGameSettings);
  }
  setters.setIsPaused(loadedProgression.isPaused);
  setters.setGameSpeed(clampGameSpeed(loadedProgression.gameSpeed));
  setters.setGameTimeMs(loadedProgression.gameTimeMs);
  setters.setDetailCharId(null);

  closeOverlays();
};
