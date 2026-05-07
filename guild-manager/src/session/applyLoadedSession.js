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
  setters.setCalendarState(loadedCalendarState);
  if (setters.setRaidLockouts) setters.setRaidLockouts(loadedRaidLockouts || {});
  setters.setIsPaused(loadedProgression.isPaused);
  setters.setGameSpeed(clampGameSpeed(loadedProgression.gameSpeed));
  setters.setGameTimeMs(loadedProgression.gameTimeMs);
  setters.setDetailCharId(null);

  closeOverlays();
};
