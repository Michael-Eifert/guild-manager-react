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

const normalizeLockoutId = (value) => {
  const raw = String(value || "").trim();
  return raw || null;
};

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
    .replace(/['\u2019]/g, "")
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

const buildNormalizedLockout = ({
  entry,
  raidKey,
  missionId = null,
  raidName = "Raid",
  currentDayIndex = 0,
  fallbackLockoutId = "1",
  fallbackDisplayId = 1,
}) => {
  const source = entry && typeof entry === "object" ? entry : {};
  const nextResetDayIndex = Math.floor(Number(source.nextResetDayIndex));
  if (!Number.isFinite(nextResetDayIndex) || nextResetDayIndex <= currentDayIndex) {
    return null;
  }
  const totalBosses = Math.max(1, Math.floor(Number(source.totalBosses) || 1));
  const clearedSteps = Math.max(
    0,
    Math.min(totalBosses, Math.floor(Number(source.clearedSteps) || 0)),
  );
  const numericDisplayId = Math.max(
    1,
    Math.floor(Number(source.displayId ?? source.lockoutId ?? fallbackDisplayId) || fallbackDisplayId),
  );
  const lockoutId =
    normalizeLockoutId(source.lockoutId) || String(fallbackLockoutId || numericDisplayId);

  return {
    lockoutId,
    displayId: numericDisplayId,
    raidKey,
    missionId: source.missionId ?? missionId,
    raidName: String(source.raidName || raidName || "Raid"),
    resetStartDayIndex: Math.max(
      0,
      Math.floor(Number(source.resetStartDayIndex) || 0),
    ),
    nextResetDayIndex,
    clearedSteps,
    totalBosses,
    completed: Boolean(source.completed) || clearedSteps >= totalBosses,
    participantIds: normalizeIdList(source.participantIds),
  };
};

const normalizeRaidEntry = ({ key, lockout, currentDayIndex }) => {
  const entry = lockout && typeof lockout === "object" ? lockout : {};
  const raidKey = getRaidLockoutKey({ raidLockoutId: entry.raidKey || key });
  if (!raidKey) return null;

  const rawLockouts = Array.isArray(entry.lockouts) ? entry.lockouts : null;
  const sourceLockouts =
    rawLockouts ||
    (entry.nextResetDayIndex
      ? [
          {
            ...entry,
            lockoutId: entry.lockoutId || "1",
            displayId: entry.displayId || 1,
          },
        ]
      : []);
  const lockouts = sourceLockouts
    .map((source, index) =>
      buildNormalizedLockout({
        entry: source,
        raidKey,
        missionId: entry.missionId ?? null,
        raidName: entry.raidName || "Raid",
        currentDayIndex,
        fallbackLockoutId: String(index + 1),
        fallbackDisplayId: index + 1,
      }),
    )
    .filter(Boolean)
    .sort((left, right) => left.displayId - right.displayId);

  if (lockouts.length === 0) return null;

  const nextDisplayId = Math.max(
    lockouts.length + 1,
    Math.floor(Number(entry.nextDisplayId) || 1),
    ...lockouts.map((raidLockout) => raidLockout.displayId + 1),
  );
  const first = lockouts[0];
  return {
    raidKey,
    missionId: entry.missionId ?? first.missionId ?? null,
    raidName: String(entry.raidName || first.raidName || "Raid"),
    lockouts,
    nextDisplayId,
    // Legacy summary fields keep older UI/test callers from exploding while
    // newer code reads the per-character instances above.
    resetStartDayIndex: first.resetStartDayIndex,
    nextResetDayIndex: first.nextResetDayIndex,
    clearedSteps: first.clearedSteps,
    totalBosses: first.totalBosses,
    completed: lockouts.every((raidLockout) => raidLockout.completed),
    participantIds: normalizeIdList(
      lockouts.flatMap((raidLockout) => raidLockout.participantIds),
    ),
  };
};

export const normalizeRaidLockouts = (value, currentDayIndex = 0) => {
  const source = value && typeof value === "object" ? value : {};
  const safeDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  return Object.entries(source).reduce((acc, [key, lockout]) => {
    const normalized = normalizeRaidEntry({
      key,
      lockout,
      currentDayIndex: safeDay,
    });
    if (normalized) acc[normalized.raidKey] = normalized;
    return acc;
  }, {});
};

export const getActiveRaidLockouts = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
}) => {
  if (mission?.isRaid !== true) return [];
  const raidKey = getRaidLockoutKey(mission);
  const lockouts = normalizeRaidLockouts(raidLockouts, currentDayIndex);
  const entry = lockouts[raidKey];
  if (!entry) return [];
  const window = getRaidResetWindow(mission, currentDayIndex);
  return entry.lockouts.filter(
    (lockout) => lockout.resetStartDayIndex === window.resetStartDayIndex,
  );
};

export const getActiveRaidLockout = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
  memberIds = [],
}) => {
  const activeLockouts = getActiveRaidLockouts({
    raidLockouts,
    mission,
    currentDayIndex,
  });
  const selectedIds = normalizeIdList(memberIds);
  if (selectedIds.length === 0) {
    return activeLockouts.find((lockout) => !lockout.completed) || activeLockouts[0] || null;
  }
  return (
    activeLockouts.find((lockout) =>
      selectedIds.some((id) => lockout.participantIds.includes(id)),
    ) || null
  );
};

const getPartyLockouts = ({ activeLockouts, memberIds }) => {
  const selectedIds = normalizeIdList(memberIds);
  if (selectedIds.length === 0) return [];
  return activeLockouts.filter((lockout) =>
    selectedIds.some((id) => lockout.participantIds.includes(id)),
  );
};

export const getRaidLockoutStatus = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
  memberIds = [],
}) => {
  const activeLockouts = getActiveRaidLockouts({
    raidLockouts,
    mission,
    currentDayIndex,
  });
  const selectedIds = normalizeIdList(memberIds);
  const partyLockouts = getPartyLockouts({ activeLockouts, memberIds: selectedIds });
  const completedMemberIds = selectedIds.filter((id) =>
    partyLockouts.some(
      (lockout) => lockout.completed && lockout.participantIds.includes(id),
    ),
  );
  const hasLockoutConflict = partyLockouts.length > 1;
  const lockout =
    partyLockouts[0] ||
    activeLockouts.find((activeLockout) => !activeLockout.completed) ||
    activeLockouts[0] ||
    null;
  const window = mission?.isRaid
    ? getRaidResetWindow(mission, currentDayIndex)
    : null;
  const isCompletedLocked = completedMemberIds.length > 0;
  return {
    lockout,
    activeLockouts,
    partyLockouts,
    resetWindow: window,
    isCompletedLocked,
    hasLockoutConflict,
    completedMemberIds,
    canEnter: !isCompletedLocked && !hasLockoutConflict,
    clearedSteps: Math.max(0, Math.floor(Number(lockout?.clearedSteps) || 0)),
    totalBosses: Math.max(1, Math.floor(Number(lockout?.totalBosses) || 1)),
  };
};

const getNextLockoutIdentity = (entry) => {
  const existingDisplayIds = new Set(
    (entry?.lockouts || []).map((lockout) => Math.max(1, Number(lockout.displayId) || 1)),
  );
  let displayId = Math.max(1, Math.floor(Number(entry?.nextDisplayId) || 1));
  while (existingDisplayIds.has(displayId)) displayId += 1;
  return {
    lockoutId: String(displayId),
    displayId,
    nextDisplayId: displayId + 1,
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
  const selectedIds = normalizeIdList(memberIds);
  const existingEntry = current[raidKey] || {
    raidKey,
    missionId: mission.id ?? null,
    raidName: mission.dungeonSetName || mission.name || "Raid",
    lockouts: [],
    nextDisplayId: 1,
  };
  const activeLockouts = existingEntry.lockouts.filter(
    (lockout) => lockout.resetStartDayIndex === window.resetStartDayIndex,
  );
  const partyLockouts = getPartyLockouts({ activeLockouts, memberIds: selectedIds });
  if (
    partyLockouts.length > 1 ||
    partyLockouts.some((lockout) => lockout.completed)
  ) {
    return current;
  }

  const bossCount = Math.max(
    1,
    Math.floor(Number(totalBosses) || Number(partyLockouts[0]?.totalBosses) || 1),
  );
  const targetLockout = partyLockouts[0] || null;
  const identity = targetLockout
    ? {
        lockoutId: targetLockout.lockoutId,
        displayId: targetLockout.displayId,
        nextDisplayId: existingEntry.nextDisplayId,
      }
    : getNextLockoutIdentity(existingEntry);
  const nextLockout = {
    raidKey,
    lockoutId: identity.lockoutId,
    displayId: identity.displayId,
    missionId: mission.id ?? targetLockout?.missionId ?? null,
    raidName:
      mission.dungeonSetName || mission.name || targetLockout?.raidName || "Raid",
    resetStartDayIndex: window.resetStartDayIndex,
    nextResetDayIndex: window.nextResetDayIndex,
    clearedSteps: Math.max(
      0,
      Math.min(bossCount, Math.floor(Number(targetLockout?.clearedSteps) || 0)),
    ),
    totalBosses: bossCount,
    completed: Boolean(targetLockout?.completed),
    participantIds: normalizeIdList([
      ...(targetLockout?.participantIds || []),
      ...selectedIds,
    ]),
  };
  const nextLockouts = [
    ...existingEntry.lockouts.filter(
      (lockout) => lockout.lockoutId !== nextLockout.lockoutId,
    ),
    nextLockout,
  ].sort((left, right) => left.displayId - right.displayId);

  return normalizeRaidLockouts(
    {
      ...current,
      [raidKey]: {
        ...existingEntry,
        raidKey,
        missionId: mission.id ?? existingEntry.missionId ?? null,
        raidName: mission.dungeonSetName || mission.name || existingEntry.raidName || "Raid",
        lockouts: nextLockouts,
        nextDisplayId: identity.nextDisplayId,
      },
    },
    currentDayIndex,
  );
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
  const entry = started[raidKey];
  if (!entry) return started;
  const selectedIds = normalizeIdList(memberIds);
  const activeLockouts = getActiveRaidLockouts({
    raidLockouts: started,
    mission,
    currentDayIndex,
  });
  const partyLockouts = getPartyLockouts({ activeLockouts, memberIds: selectedIds });
  if (partyLockouts.length !== 1) return started;
  const existing = partyLockouts[0];
  const bossCount = Math.max(
    1,
    Math.floor(Number(totalBosses) || Number(existing.totalBosses) || 1),
  );
  const nextClearedSteps = Math.max(
    Math.floor(Number(existing.clearedSteps) || 0),
    Math.min(bossCount, Math.floor(Number(clearedSteps) || 0)),
  );
  const nextLockout = {
    ...existing,
    totalBosses: bossCount,
    clearedSteps: nextClearedSteps,
    completed: nextClearedSteps >= bossCount,
    participantIds: normalizeIdList([
      ...(existing.participantIds || []),
      ...selectedIds,
    ]),
  };
  return normalizeRaidLockouts(
    {
      ...started,
      [raidKey]: {
        ...entry,
        lockouts: [
          ...entry.lockouts.filter(
            (lockout) => lockout.lockoutId !== existing.lockoutId,
          ),
          nextLockout,
        ].sort((left, right) => left.displayId - right.displayId),
      },
    },
    currentDayIndex,
  );
};

export const getRaidResumeProgress = ({
  raidLockouts,
  mission,
  currentDayIndex = 0,
  memberIds = [],
}) => {
  const status = getRaidLockoutStatus({
    raidLockouts,
    mission,
    currentDayIndex,
    memberIds,
  });
  if (!status.canEnter || status.isCompletedLocked) return 0;
  return status.partyLockouts.length === 1 ? status.clearedSteps : 0;
};
