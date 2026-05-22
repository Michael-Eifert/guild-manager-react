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
    loadedProgression,
    loadedCalendarState,
    loadedRaidLockouts,
  } = loadedSession;
  const zoneReadyRoster = normalizeRosterZones(
    normalizedRoster,
    loadedGuildSetup?.faction || factionFallback,
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
  refs.gameTime.current = loadedProgression.gameTimeMs;
  refs.lastRealTime.current = getCurrentTime();

  setters.setRoster(zoneReadyRoster);
  setters.setActiveMissions(loadedActiveMissions);
  setters.setMissionList(getMissionListWithZones(loadedMissionList));
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
  setters.setIsPaused(loadedProgression.isPaused);
  setters.setGameSpeed(clampGameSpeed(loadedProgression.gameSpeed));
  setters.setGameTimeMs(loadedProgression.gameTimeMs);
  setters.setDetailCharId(null);

  closeOverlays();
};
