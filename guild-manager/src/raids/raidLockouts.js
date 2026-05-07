export const RAID_RESET_TYPE = Object.freeze({
  WEEKLY: "weekly",
  INTERVAL: "interval",
});

const DEFAULT_WEEKLY_RESET_WEEKDAY = 2;
const DEFAULT_INTERVAL_DAYS = 7;

const normalizeIdList = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  ),
];

export const getRaidLockoutKey = (mission) => {
  const raw =
    mission?.raidLockoutId ||
    mission?.dungeonSetId ||
    mission?.dungeonSetName ||
    mission?.name ||
    mission?.id;
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const getRaidResetWindow = (mission, dayIndex = 0) => {
  const safeDay = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const schedule = mission?.raidReset || {};
  const resetType = schedule.type || RAID_RESET_TYPE.WEEKLY;

  if (resetType === RAID_RESET_TYPE.INTERVAL) {
    const intervalDays = Math.max(
      1,
      Math.floor(Number(schedule.intervalDays) || DEFAULT_INTERVAL_DAYS),
    );
    const anchorDayIndex = Math.max(
      0,
      Math.floor(Number(schedule.anchorDayIndex) || 0),
    );
    const elapsed = safeDay - anchorDayIndex;
    const completedIntervals =
      elapsed >= 0 ? Math.floor(elapsed / intervalDays) : 0;
    const resetStartDayIndex = Math.max(
      0,
      anchorDayIndex + completedIntervals * intervalDays,
    );
    return {
      resetStartDayIndex,
      nextResetDayIndex: resetStartDayIndex + intervalDays,
      type: RAID_RESET_TYPE.INTERVAL,
      intervalDays,
      anchorDayIndex,
    };
  }

  const resetWeekday = Math.max(
    0,
    Math.min(
      6,
      Math.floor(Number(schedule.weekday) || DEFAULT_WEEKLY_RESET_WEEKDAY),
    ),
  );
  const daysSinceReset = (safeDay - resetWeekday + 7) % 7;
  const resetStartDayIndex = Math.max(0, safeDay - daysSinceReset);
  return {
    resetStartDayIndex,
    nextResetDayIndex: resetStartDayIndex + 7,
    type: RAID_RESET_TYPE.WEEKLY,
    weekday: resetWeekday,
  };
};

export const formatRaidResetSchedule = (mission) => {
  const schedule = mission?.raidReset || {};
  if (schedule.type === RAID_RESET_TYPE.INTERVAL) {
    const intervalDays = Math.max(
      1,
      Math.floor(Number(schedule.intervalDays) || DEFAULT_INTERVAL_DAYS),
    );
    return `Resets every ${intervalDays} day${intervalDays === 1 ? "" : "s"}`;
  }
  const weekdayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const weekday = Math.max(
    0,
    Math.min(
      6,
      Math.floor(Number(schedule.weekday) || DEFAULT_WEEKLY_RESET_WEEKDAY),
    ),
  );
  return `Resets ${weekdayNames[weekday]}`;
};

export const normalizeRaidLockouts = (value, currentDayIndex = 0) => {
  const source = value && typeof value === "object" ? value : {};
  const safeDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  return Object.entries(source).reduce((acc, [key, lockout]) => {
    const entry = lockout && typeof lockout === "object" ? lockout : {};
    const raidKey = getRaidLockoutKey({ raidLockoutId: entry.raidKey || key });
    if (!raidKey) return acc;
    const nextResetDayIndex = Math.floor(Number(entry.nextResetDayIndex));
    if (!Number.isFinite(nextResetDayIndex) || nextResetDayIndex <= safeDay) {
      return acc;
    }
    const totalBosses = Math.max(1, Math.floor(Number(entry.totalBosses) || 1));
    const clearedSteps = Math.max(
      0,
      Math.min(totalBosses, Math.floor(Number(entry.clearedSteps) || 0)),
    );
    acc[raidKey] = {
      raidKey,
      missionId: entry.missionId ?? null,
      raidName: String(entry.raidName || "Raid"),
      resetStartDayIndex: Math.max(
        0,
        Math.floor(Number(entry.resetStartDayIndex) || 0),
      ),
      nextResetDayIndex,
      clearedSteps,
      totalBosses,
      completed: Boolean(entry.completed) || clearedSteps >= totalBosses,
      participantIds: normalizeIdList(entry.participantIds),
    };
    return acc;
  }, {});
};

export const getActiveRaidLockout = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
}) => {
  if (mission?.isRaid !== true) return null;
  const raidKey = getRaidLockoutKey(mission);
  const lockouts = normalizeRaidLockouts(raidLockouts, currentDayIndex);
  const lockout = lockouts[raidKey];
  if (!lockout) return null;
  const window = getRaidResetWindow(mission, currentDayIndex);
  if (lockout.resetStartDayIndex !== window.resetStartDayIndex) return null;
  return lockout;
};

export const getRaidLockoutStatus = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
}) => {
  const lockout = getActiveRaidLockout({
    raidLockouts,
    mission,
    currentDayIndex,
  });
  const window = mission?.isRaid
    ? getRaidResetWindow(mission, currentDayIndex)
    : null;
  return {
    lockout,
    resetWindow: window,
    isCompletedLocked: Boolean(lockout?.completed),
    canEnter: !lockout?.completed,
    clearedSteps: Math.max(0, Math.floor(Number(lockout?.clearedSteps) || 0)),
    totalBosses: Math.max(1, Math.floor(Number(lockout?.totalBosses) || 1)),
  };
};

export const startRaidLockout = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
  memberIds = [],
  totalBosses = 1,
}) => {
  if (mission?.isRaid !== true) {
    return normalizeRaidLockouts(raidLockouts, currentDayIndex);
  }
  const current = normalizeRaidLockouts(raidLockouts, currentDayIndex);
  const raidKey = getRaidLockoutKey(mission);
  const window = getRaidResetWindow(mission, currentDayIndex);
  const existing =
    current[raidKey]?.resetStartDayIndex === window.resetStartDayIndex
      ? current[raidKey]
      : null;
  const bossCount = Math.max(
    1,
    Math.floor(Number(totalBosses) || Number(existing?.totalBosses) || 1),
  );
  return {
    ...current,
    [raidKey]: {
      raidKey,
      missionId: mission.id ?? existing?.missionId ?? null,
      raidName: mission.dungeonSetName || mission.name || existing?.raidName || "Raid",
      resetStartDayIndex: window.resetStartDayIndex,
      nextResetDayIndex: window.nextResetDayIndex,
      clearedSteps: Math.max(
        0,
        Math.min(bossCount, Math.floor(Number(existing?.clearedSteps) || 0)),
      ),
      totalBosses: bossCount,
      completed: Boolean(existing?.completed),
      participantIds: normalizeIdList([
        ...(existing?.participantIds || []),
        ...normalizeIdList(memberIds),
      ]),
    },
  };
};

export const updateRaidLockoutProgress = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
  memberIds = [],
  clearedSteps = 0,
  totalBosses = 1,
}) => {
  const started = startRaidLockout({
    raidLockouts,
    mission,
    currentDayIndex,
    memberIds,
    totalBosses,
  });
  if (mission?.isRaid !== true) return started;
  const raidKey = getRaidLockoutKey(mission);
  const existing = started[raidKey];
  if (!existing) return started;
  const bossCount = Math.max(
    1,
    Math.floor(Number(totalBosses) || Number(existing.totalBosses) || 1),
  );
  const nextClearedSteps = Math.max(
    Math.floor(Number(existing.clearedSteps) || 0),
    Math.min(bossCount, Math.floor(Number(clearedSteps) || 0)),
  );
  return {
    ...started,
    [raidKey]: {
      ...existing,
      totalBosses: bossCount,
      clearedSteps: nextClearedSteps,
      completed: nextClearedSteps >= bossCount,
      participantIds: normalizeIdList([
        ...(existing.participantIds || []),
        ...normalizeIdList(memberIds),
      ]),
    },
  };
};

export const getRaidResumeProgress = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
}) => {
  const status = getRaidLockoutStatus({
    raidLockouts,
    mission,
    currentDayIndex,
  });
  if (status.isCompletedLocked) return 0;
  return status.clearedSteps;
};
