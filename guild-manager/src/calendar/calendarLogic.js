import {
  getRaidLockoutKey,
  getRaidResetWindow,
} from "../raids/raidLockouts";

export const CALENDAR_DAY_MS = 10 * 60 * 1000;
export const CALENDAR_MATERIALIZE_HORIZON_DAYS = 60;
export const CALENDAR_SERIES_DURATION_OPTIONS = Object.freeze([4, 8]);
export const DEFAULT_CALENDAR_SERIES_DURATION_WEEKS = 8;
export const CALENDAR_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  READY: "ready",
  RUNNING: "running",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});
export const CALENDAR_SERIES_TYPE = Object.freeze({
  WEEKLY: "weekly",
  INTERVAL: "interval",
});
export const CALENDAR_TIME_OF_DAY = Object.freeze({
  MORNING: "morning",
  MIDDAY: "midday",
  EVENING: "evening",
});
export const CALENDAR_TIME_OF_DAY_OPTIONS = Object.freeze([
  { value: CALENDAR_TIME_OF_DAY.MORNING, label: "Morning", dayProgress: 0.25 },
  { value: CALENDAR_TIME_OF_DAY.MIDDAY, label: "Midday", dayProgress: 0.5 },
  { value: CALENDAR_TIME_OF_DAY.EVENING, label: "Evening", dayProgress: 0.75 },
]);
export const CALENDAR_WEEKDAYS = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);
export const CALENDAR_MONTHS = Object.freeze([
  { name: "January", days: 31 },
  { name: "February", days: 28 },
  { name: "March", days: 31 },
  { name: "April", days: 30 },
  { name: "May", days: 31 },
  { name: "June", days: 30 },
  { name: "July", days: 31 },
  { name: "August", days: 31 },
  { name: "September", days: 30 },
  { name: "October", days: 31 },
  { name: "November", days: 30 },
  { name: "December", days: 31 },
]);

const DAYS_PER_YEAR = CALENDAR_MONTHS.reduce((sum, month) => sum + month.days, 0);

const toObject = (value) =>
  value && typeof value === "object" ? value : {};

const normalizeIdList = (value) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  ),
];

export const getCalendarMissionKey = (missionId, missionIds = []) =>
  normalizeIdList(
    Array.isArray(missionIds) && missionIds.length > 0
      ? missionIds
      : [missionId],
  )
    .sort()
    .join("|");

export const hasDuplicateCalendarEvent = ({
  events,
  missionId,
  missionIds = [],
  scheduledDayIndex,
  scheduledTimeOfDay,
}) => {
  const missionKey = getCalendarMissionKey(missionId, missionIds);
  return (Array.isArray(events) ? events : []).some(
    (event) =>
      event?.status !== CALENDAR_STATUS.CANCELLED &&
      Number(event?.scheduledDayIndex) === Number(scheduledDayIndex) &&
      String(event?.scheduledTimeOfDay || "") ===
        String(scheduledTimeOfDay || "") &&
      getCalendarMissionKey(event?.missionId, event?.missionIds) === missionKey,
  );
};

export const hasDuplicateCalendarSeries = ({
  series,
  missionId,
  missionIds = [],
  seriesType,
  scheduledTimeOfDay,
  startsOnDayIndex,
  weekday,
  intervalDays,
}) => {
  const missionKey = getCalendarMissionKey(missionId, missionIds);
  return (Array.isArray(series) ? series : []).some(
    (entry) =>
      entry?.active !== false &&
      String(entry?.seriesType || "") === String(seriesType || "") &&
      String(entry?.scheduledTimeOfDay || "") ===
        String(scheduledTimeOfDay || "") &&
      Number(entry?.startsOnDayIndex) === Number(startsOnDayIndex) &&
      Number(entry?.weekday) === Number(weekday) &&
      Number(entry?.intervalDays || 7) === Number(intervalDays || 7) &&
      getCalendarMissionKey(entry?.missionId, entry?.missionIds) === missionKey,
  );
};

const normalizeStatus = (status) =>
  Object.values(CALENDAR_STATUS).includes(status)
    ? status
    : CALENDAR_STATUS.SCHEDULED;

const normalizeSeriesType = (type) =>
  Object.values(CALENDAR_SERIES_TYPE).includes(type)
    ? type
    : CALENDAR_SERIES_TYPE.WEEKLY;

export const normalizeCalendarTimeOfDay = (value) =>
  CALENDAR_TIME_OF_DAY_OPTIONS.some((option) => option.value === value)
    ? value
    : CALENDAR_TIME_OF_DAY.EVENING;

export const getCalendarTimeOfDayOption = (value) =>
  CALENDAR_TIME_OF_DAY_OPTIONS.find(
    (option) => option.value === normalizeCalendarTimeOfDay(value),
  ) || CALENDAR_TIME_OF_DAY_OPTIONS[2];

export const getMissionInstanceKey = (mission) =>
  String(
    mission?.instanceId ||
      `${mission?.questId || mission?.id || "mission"}-${mission?.startTime || 0}`,
  );

export const getCalendarDayIndex = (gameTimeMs, calendarEpochGameTimeMs) => {
  const gameTime = Number(gameTimeMs);
  const epoch = Number(calendarEpochGameTimeMs);
  if (!Number.isFinite(gameTime) || !Number.isFinite(epoch)) return 0;
  return Math.max(0, Math.floor((gameTime - epoch) / CALENDAR_DAY_MS));
};

export const getCalendarDayProgress = (gameTimeMs, calendarEpochGameTimeMs) => {
  const gameTime = Number(gameTimeMs);
  const epoch = Number(calendarEpochGameTimeMs);
  if (!Number.isFinite(gameTime) || !Number.isFinite(epoch)) return 0;
  const elapsed = Math.max(0, gameTime - epoch);
  return (elapsed % CALENDAR_DAY_MS) / CALENDAR_DAY_MS;
};

export const getCalendarDate = (dayIndex) => {
  const safeDayIndex = Math.max(0, Math.floor(Number(dayIndex) || 0));
  const year = Math.floor(safeDayIndex / DAYS_PER_YEAR) + 1;
  let dayOfYear = safeDayIndex % DAYS_PER_YEAR;
  let monthIndex = 0;
  while (
    monthIndex < CALENDAR_MONTHS.length - 1 &&
    dayOfYear >= CALENDAR_MONTHS[monthIndex].days
  ) {
    dayOfYear -= CALENDAR_MONTHS[monthIndex].days;
    monthIndex += 1;
  }

  const weekdayIndex = safeDayIndex % CALENDAR_WEEKDAYS.length;
  return {
    dayIndex: safeDayIndex,
    year,
    monthIndex,
    monthName: CALENDAR_MONTHS[monthIndex].name,
    dayOfMonth: dayOfYear + 1,
    weekdayIndex,
    weekdayName: CALENDAR_WEEKDAYS[weekdayIndex],
  };
};

export const getCalendarDayIndexFromDate = ({ year, monthIndex, dayOfMonth }) => {
  const safeYear = Math.max(1, Math.floor(Number(year) || 1));
  const safeMonthIndex = Math.max(
    0,
    Math.min(CALENDAR_MONTHS.length - 1, Math.floor(Number(monthIndex) || 0)),
  );
  const safeDayOfMonth = Math.max(
    1,
    Math.min(
      CALENDAR_MONTHS[safeMonthIndex].days,
      Math.floor(Number(dayOfMonth) || 1),
    ),
  );
  const priorMonthDays = CALENDAR_MONTHS.slice(0, safeMonthIndex).reduce(
    (sum, month) => sum + month.days,
    0,
  );
  return (safeYear - 1) * DAYS_PER_YEAR + priorMonthDays + safeDayOfMonth - 1;
};

export const formatCalendarDate = (dayIndex) => {
  const date = getCalendarDate(dayIndex);
  return `${date.weekdayName}, ${date.monthName} ${date.dayOfMonth}, Year ${date.year}`;
};

export const getCalendarMonthGrid = (year, monthIndex) => {
  const safeYear = Math.max(1, Math.floor(Number(year) || 1));
  const safeMonthIndex = Math.max(
    0,
    Math.min(CALENDAR_MONTHS.length - 1, Math.floor(Number(monthIndex) || 0)),
  );
  const firstDayIndex = getCalendarDayIndexFromDate({
    year: safeYear,
    monthIndex: safeMonthIndex,
    dayOfMonth: 1,
  });
  const firstWeekday = getCalendarDate(firstDayIndex).weekdayIndex;
  const days = [];

  for (let offset = 0; offset < firstWeekday; offset += 1) {
    days.push(null);
  }

  for (let day = 1; day <= CALENDAR_MONTHS[safeMonthIndex].days; day += 1) {
    const dayIndex = getCalendarDayIndexFromDate({
      year: safeYear,
      monthIndex: safeMonthIndex,
      dayOfMonth: day,
    });
    days.push({ dayIndex, dayOfMonth: day });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

export const createInitialCalendarState = (
  calendarStartGameTimeMs = Date.now(),
  initialDayIndex = 0,
) => ({
  calendarEpochGameTimeMs:
    calendarStartGameTimeMs -
    Math.max(0, Math.floor(Number(initialDayIndex) || 0)) * CALENDAR_DAY_MS,
  calendarEvents: [],
  calendarSeries: [],
  calendarEventHistory: [],
});

export const normalizeCalendarState = (rawState, fallbackEpochGameTimeMs = Date.now()) => {
  const source = toObject(rawState);
  const epoch = Number(source.calendarEpochGameTimeMs);
  return {
    calendarEpochGameTimeMs: Number.isFinite(epoch) ? epoch : fallbackEpochGameTimeMs,
    calendarEvents: (Array.isArray(source.calendarEvents) ? source.calendarEvents : [])
      .map((event) => {
        const scheduledDayIndex = Math.floor(Number(event?.scheduledDayIndex));
        if (!Number.isFinite(scheduledDayIndex) || scheduledDayIndex < 0) return null;
        return {
          id: String(event?.id || "").trim(),
          title: String(event?.title || "Raid Event").trim(),
          missionId: event?.missionId,
          missionIds: normalizeIdList(event?.missionIds),
          scheduledDayIndex,
          scheduledTimeOfDay: normalizeCalendarTimeOfDay(event?.scheduledTimeOfDay),
          autoStart: event?.autoStart !== false,
          status: normalizeStatus(event?.status),
          registrations: normalizeIdList(event?.registrations),
          approvedRosterIds: normalizeIdList(event?.approvedRosterIds),
          benchedIds: normalizeIdList(event?.benchedIds),
          rosterLocked: event?.rosterLocked === true,
          lockedRosterIds: normalizeIdList(event?.lockedRosterIds),
          createdAtDayIndex: Math.max(0, Math.floor(Number(event?.createdAtDayIndex) || 0)),
          seriesId: event?.seriesId ? String(event.seriesId) : null,
          runningMissionInstanceId: event?.runningMissionInstanceId || null,
          completedAtDayIndex: Number.isFinite(Number(event?.completedAtDayIndex))
            ? Math.max(0, Math.floor(Number(event.completedAtDayIndex)))
            : null,
        };
      })
      .filter((event) => event && event.id),
    calendarSeries: (Array.isArray(source.calendarSeries) ? source.calendarSeries : [])
      .map((series) => {
        const weekday = Math.floor(Number(series?.weekday));
        return {
          id: String(series?.id || "").trim(),
          title: String(series?.title || "Weekly Raid").trim(),
          missionId: series?.missionId,
          missionIds: normalizeIdList(series?.missionIds),
          weekday: Math.max(0, Math.min(6, Number.isFinite(weekday) ? weekday : 0)),
          scheduledTimeOfDay: normalizeCalendarTimeOfDay(series?.scheduledTimeOfDay),
          autoStart: series?.autoStart !== false,
          active: series?.active !== false,
          startsOnDayIndex: Math.max(0, Math.floor(Number(series?.startsOnDayIndex) || 0)),
          seriesType: normalizeSeriesType(series?.seriesType),
          intervalDays: Math.max(1, Math.floor(Number(series?.intervalDays) || 7)),
          durationWeeks: CALENDAR_SERIES_DURATION_OPTIONS.includes(
            Math.floor(Number(series?.durationWeeks)),
          )
            ? Math.floor(Number(series.durationWeeks))
            : DEFAULT_CALENDAR_SERIES_DURATION_WEEKS,
        };
      })
      .filter((series) => series.id),
    calendarEventHistory: Array.isArray(source.calendarEventHistory)
      ? source.calendarEventHistory.map((entry) => ({ ...toObject(entry) }))
      : [],
  };
};

const getMissionIdKey = (missionId) => String(missionId ?? "");

const getMissionById = (missionList, missionId) => {
  const missionIdKey = getMissionIdKey(missionId);
  return (Array.isArray(missionList) ? missionList : []).find(
    (mission) => getMissionIdKey(mission?.id) === missionIdKey,
  );
};

const getRequiredKeyIds = (mission) => [
  ...new Set(
    [
      mission?.requiresKey ? mission?.keyId : null,
      ...(Array.isArray(mission?.requiredKeys) ? mission.requiredKeys : []),
    ]
      .map((keyId) => String(keyId || "").trim())
      .filter(Boolean),
  ),
];

export const isCharacterEligibleForCalendarEvent = ({
  character,
  mission,
  activeMemberIds = new Set(),
  activeDungeonMemberIds = new Set(),
  raidLockoutStatus = null,
}) => {
  if (!character || !mission) return false;
  if (raidLockoutStatus?.isCompletedLocked) return false;
  if (raidLockoutStatus?.hasLockoutConflict) return false;
  if (raidLockoutStatus?.isWingLocked) return false;
  const characterId = String(character.id || "");
  if (mission.isRaid !== true) {
    const isActiveInDungeon = activeDungeonMemberIds.has(characterId);
    if (activeMemberIds.has(characterId) && !isActiveInDungeon) return false;
    if (
      (character.status === "Questing" || character.status === "Battleground") &&
      !isActiveInDungeon
    ) {
      return false;
    }
  }

  const level = Number(character.level) || 1;
  const entryLevel = Number(mission.entryLevel);
  const minLevel = Number.isFinite(entryLevel) && entryLevel > 0
    ? entryLevel
    : Number(mission.minLevel) || Math.max(1, (Number(mission.level) || 1) - 6);
  if (level < minLevel) return false;

  const requiredKeyIds = getRequiredKeyIds(mission);
  if (requiredKeyIds.length > 0 && mission.requiresKeyForAllMembers === true) {
    const characterKeys = new Set(normalizeIdList(character.keys));
    return requiredKeyIds.every((keyId) => characterKeys.has(keyId));
  }

  return true;
};

export const getCalendarEventSignups = ({
  event,
  missionList,
  roster,
  activeMissions,
  getRaidLockoutStatus,
  currentDayIndex,
}) => {
  const mission = getMissionById(missionList, event?.missionId);
  const activeMemberIds = new Set(
    (Array.isArray(activeMissions) ? activeMissions : []).flatMap((missionRun) =>
      normalizeIdList(missionRun?.memberIds),
    ),
  );
  const activeDungeonMemberIds = new Set(
    (Array.isArray(activeMissions) ? activeMissions : [])
      .filter((missionRun) => missionRun?.type === "dungeon")
      .flatMap((missionRun) => normalizeIdList(missionRun?.memberIds)),
  );
  return (Array.isArray(roster) ? roster : [])
    .filter((character) => {
      const raidLockoutStatus =
        typeof getRaidLockoutStatus === "function"
          ? getRaidLockoutStatus({
              mission,
              event,
              currentDayIndex,
              memberIds: [character.id],
            })
          : null;
      return isCharacterEligibleForCalendarEvent({
        character,
        mission,
        activeMemberIds,
        activeDungeonMemberIds,
        raidLockoutStatus,
      });
    })
    .map((character) => character.id);
};

const getRoleRequirement = (mission) => ({
  Tank: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.Tank) || 0)),
  Healer: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.Healer) || 0)),
  DPS: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.DPS) || 0)),
});

export const suggestCalendarRoster = ({ mission, roster, signupIds }) => {
  const maxRoster = Math.max(1, Math.floor(Number(mission?.requiredPartySize) || 40));
  const signupIdSet = new Set(normalizeIdList(signupIds));
  const signups = (Array.isArray(roster) ? roster : []).filter((member) =>
    signupIdSet.has(member.id),
  );
  const selectedIds = [];
  const selectedIdSet = new Set();
  const requirement = getRoleRequirement(mission);
  const roleOrder = ["Tank", "Healer", "DPS"];

  roleOrder.forEach((role) => {
    const needed = requirement[role];
    if (needed <= 0) return;
    signups
      .filter((member) => member.role === role)
      .sort((left, right) => (Number(right.level) || 1) - (Number(left.level) || 1))
      .slice(0, Math.max(0, needed - selectedIds.filter((id) => {
        const selected = signups.find((member) => member.id === id);
        return selected?.role === role;
      }).length))
      .forEach((member) => {
        if (selectedIds.length >= maxRoster || selectedIdSet.has(member.id)) return;
        selectedIdSet.add(member.id);
        selectedIds.push(member.id);
      });
  });

  signups
    .filter((member) => !selectedIdSet.has(member.id))
    .sort((left, right) => {
      const leftLevel = Number(left.level) || 1;
      const rightLevel = Number(right.level) || 1;
      if (rightLevel !== leftLevel) return rightLevel - leftLevel;
      return String(left.name || "").localeCompare(String(right.name || ""));
    })
    .forEach((member) => {
      if (selectedIds.length >= maxRoster) return;
      selectedIdSet.add(member.id);
      selectedIds.push(member.id);
    });

  return selectedIds;
};

export const buildCalendarEvent = ({
  id,
  title,
  missionId,
  missionIds = [],
  scheduledDayIndex,
  scheduledTimeOfDay = CALENDAR_TIME_OF_DAY.EVENING,
  autoStart = true,
  createdAtDayIndex,
  seriesId = null,
}) => ({
  id,
  title,
  missionId,
  missionIds: normalizeIdList(missionIds),
  scheduledDayIndex: Math.max(0, Math.floor(Number(scheduledDayIndex) || 0)),
  scheduledTimeOfDay: normalizeCalendarTimeOfDay(scheduledTimeOfDay),
  autoStart: autoStart !== false,
  status: CALENDAR_STATUS.SCHEDULED,
  registrations: [],
  approvedRosterIds: [],
  benchedIds: [],
  rosterLocked: false,
  lockedRosterIds: [],
  createdAtDayIndex: Math.max(0, Math.floor(Number(createdAtDayIndex) || 0)),
  seriesId,
  runningMissionInstanceId: null,
  completedAtDayIndex: null,
});

export const getCalendarEventStartRosterIds = (event) => {
  const approvedRosterIds = normalizeIdList(event?.approvedRosterIds);
  if (event?.rosterLocked !== true) return approvedRosterIds;
  const lockedRosterIds = normalizeIdList(event?.lockedRosterIds);
  return lockedRosterIds.length > 0 ? lockedRosterIds : approvedRosterIds;
};

export const canStartCalendarEvent = (event) =>
  event?.status === CALENDAR_STATUS.READY &&
  getCalendarEventStartRosterIds(event).length > 0;

const getCalendarRaidReservationKey = ({ event, mission }) => {
  if (mission?.isRaid !== true || !event) return null;
  const raidKey = getRaidLockoutKey(mission);
  if (!raidKey) return null;
  const resetWindow = getRaidResetWindow(mission, event.scheduledDayIndex);
  return `${raidKey}:${resetWindow.resetStartDayIndex}`;
};

const buildLockedCalendarRaidReservations = ({ events, missionList }) => {
  const reservations = new Map();
  (Array.isArray(events) ? events : []).forEach((event) => {
    if (event?.rosterLocked !== true) return;
    if (
      event.status !== CALENDAR_STATUS.SCHEDULED &&
      event.status !== CALENDAR_STATUS.READY
    ) {
      return;
    }
    const mission = getMissionById(missionList, event.missionId);
    const reservationKey = getCalendarRaidReservationKey({ event, mission });
    if (!reservationKey) return;
    const memberIds = normalizeIdList(event.lockedRosterIds || event.approvedRosterIds);
    if (memberIds.length === 0) return;
    if (!reservations.has(reservationKey)) reservations.set(reservationKey, new Map());
    const reservation = reservations.get(reservationKey);
    memberIds.forEach((memberId) => {
      if (!reservation.has(memberId)) reservation.set(memberId, event.id);
    });
  });
  return reservations;
};

const buildLockedCalendarDayReservations = (events) => {
  const reservations = new Map();
  (Array.isArray(events) ? events : []).forEach((event) => {
    if (event?.rosterLocked !== true) return;
    if (
      event.status !== CALENDAR_STATUS.SCHEDULED &&
      event.status !== CALENDAR_STATUS.READY
    ) {
      return;
    }
    const memberIds = normalizeIdList(event.lockedRosterIds || event.approvedRosterIds);
    if (memberIds.length === 0) return;
    if (!reservations.has(event.scheduledDayIndex)) {
      reservations.set(event.scheduledDayIndex, new Map());
    }
    const reservation = reservations.get(event.scheduledDayIndex);
    memberIds.forEach((memberId) => {
      if (!reservation.has(memberId)) reservation.set(memberId, event.id);
    });
  });
  return reservations;
};

export const buildCalendarSeries = ({
  id,
  title,
  missionId,
  missionIds = [],
  weekday,
  scheduledTimeOfDay = CALENDAR_TIME_OF_DAY.EVENING,
  autoStart = true,
  startsOnDayIndex,
  seriesType = CALENDAR_SERIES_TYPE.WEEKLY,
  intervalDays = 7,
  durationWeeks = DEFAULT_CALENDAR_SERIES_DURATION_WEEKS,
}) => ({
  id,
  title,
  missionId,
  missionIds: normalizeIdList(missionIds),
  weekday: Math.max(0, Math.min(6, Math.floor(Number(weekday) || 0))),
  scheduledTimeOfDay: normalizeCalendarTimeOfDay(scheduledTimeOfDay),
  autoStart: autoStart !== false,
  active: true,
  startsOnDayIndex: Math.max(0, Math.floor(Number(startsOnDayIndex) || 0)),
  seriesType: normalizeSeriesType(seriesType),
  intervalDays: Math.max(1, Math.floor(Number(intervalDays) || 7)),
  durationWeeks: CALENDAR_SERIES_DURATION_OPTIONS.includes(
    Math.floor(Number(durationWeeks)),
  )
    ? Math.floor(Number(durationWeeks))
    : DEFAULT_CALENDAR_SERIES_DURATION_WEEKS,
});

export const materializeCalendarSeriesEvents = ({
  state,
  currentDayIndex,
  createId,
  horizonDays = CALENDAR_MATERIALIZE_HORIZON_DAYS,
}) => {
  const normalized = normalizeCalendarState(state, state?.calendarEpochGameTimeMs);
  const existingIds = new Set(normalized.calendarEvents.map((event) => event.id));
  const existingSeriesDays = new Set(
    normalized.calendarEvents
      .filter((event) => event.seriesId)
      .map((event) => `${event.seriesId}:${event.scheduledDayIndex}`),
  );
  const nextEvents = [...normalized.calendarEvents];
  const startDay = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  const endDay = startDay + Math.max(1, Math.floor(Number(horizonDays) || 1));

  normalized.calendarSeries
    .filter((series) => series.active)
    .forEach((series) => {
      const seriesEndDayIndex =
        series.startsOnDayIndex + Math.max(1, series.durationWeeks) * 7 - 1;
      for (
        let dayIndex = Math.max(series.startsOnDayIndex, startDay);
        dayIndex <= Math.min(endDay, seriesEndDayIndex);
        dayIndex += 1
      ) {
        const isSeriesDay =
          series.seriesType === CALENDAR_SERIES_TYPE.INTERVAL
            ? (dayIndex - series.startsOnDayIndex) % series.intervalDays === 0
            : getCalendarDate(dayIndex).weekdayIndex === series.weekday;
        if (!isSeriesDay) continue;
        const seriesDayKey = `${series.id}:${dayIndex}`;
        if (existingSeriesDays.has(seriesDayKey)) continue;
        const stableId = `event:${series.id}:${dayIndex}`;
        const eventId = existingIds.has(stableId)
          ? createId()
          : stableId;
        existingIds.add(eventId);
        existingSeriesDays.add(seriesDayKey);
        nextEvents.push(
          buildCalendarEvent({
            id: eventId,
            title: series.title,
            missionId: series.missionId,
            missionIds: series.missionIds,
            scheduledDayIndex: dayIndex,
            scheduledTimeOfDay: series.scheduledTimeOfDay,
            autoStart: series.autoStart,
            createdAtDayIndex: startDay,
            seriesId: series.id,
          }),
        );
      }
    });

  return {
    ...normalized,
    calendarEvents: nextEvents.sort(
      (left, right) => left.scheduledDayIndex - right.scheduledDayIndex,
    ),
  };
};

export const refreshCalendarState = ({
  state,
  currentDayIndex,
  roster,
  activeMissions,
  missionList,
  createId,
  getRaidLockoutStatus,
}) => {
  const materialized = materializeCalendarSeriesEvents({
    state,
    currentDayIndex,
    createId,
  });
  const safeCurrentDayIndex = Math.max(0, Math.floor(Number(currentDayIndex) || 0));
  const activeCalendarEvents = materialized.calendarEvents.filter(
    (event) =>
      event.scheduledDayIndex >= safeCurrentDayIndex ||
      (event.status !== CALENDAR_STATUS.COMPLETED &&
        event.status !== CALENDAR_STATUS.CANCELLED),
  );
  const newlyReadyEvents = [];
  const lockedRaidReservations = buildLockedCalendarRaidReservations({
    events: activeCalendarEvents,
    missionList,
  });
  const lockedDayReservations = buildLockedCalendarDayReservations(
    activeCalendarEvents,
  );
  const nextEvents = activeCalendarEvents.map((event) => {
    if (
      event.status !== CALENDAR_STATUS.SCHEDULED &&
      event.status !== CALENDAR_STATUS.READY
    ) {
      return event;
    }

    const mission = getMissionById(missionList, event.missionId);
    if (event.rosterLocked) {
      const lockedRosterIds = normalizeIdList(event.lockedRosterIds || event.approvedRosterIds);
      const shouldBecomeReady =
        event.status === CALENDAR_STATUS.SCHEDULED &&
        event.scheduledDayIndex <= currentDayIndex;
      const nextEvent = {
        ...event,
        status: shouldBecomeReady ? CALENDAR_STATUS.READY : event.status,
        registrations: lockedRosterIds,
        approvedRosterIds: lockedRosterIds,
        benchedIds: [],
        lockedRosterIds,
      };
      if (shouldBecomeReady) newlyReadyEvents.push(nextEvent);
      return nextEvent;
    }
    const reservationKey = getCalendarRaidReservationKey({ event, mission });
    const reservedRaidMemberIds = lockedRaidReservations.get(reservationKey) || new Map();
    const reservedDayMemberIds = lockedDayReservations.get(event.scheduledDayIndex) || new Map();
    const registrations = getCalendarEventSignups({
      event,
      missionList,
      roster,
      activeMissions,
      getRaidLockoutStatus,
      currentDayIndex: event.scheduledDayIndex,
    }).filter(
      (id) =>
        (reservedDayMemberIds.get(id) === undefined ||
          reservedDayMemberIds.get(id) === event.id) &&
        (reservedRaidMemberIds.get(id) === undefined ||
          reservedRaidMemberIds.get(id) === event.id),
    );
    const approvedRosterIds =
      event.approvedRosterIds.length > 0
        ? event.approvedRosterIds.filter((id) => registrations.includes(id))
        : suggestCalendarRoster({ mission, roster, signupIds: registrations });
    const benchedIds = registrations.filter((id) => !approvedRosterIds.includes(id));
    const shouldBecomeReady =
      event.status === CALENDAR_STATUS.SCHEDULED &&
      event.scheduledDayIndex <= currentDayIndex;
    const nextEvent = {
      ...event,
      status: shouldBecomeReady ? CALENDAR_STATUS.READY : event.status,
      registrations,
      approvedRosterIds,
      benchedIds,
    };
    if (shouldBecomeReady) newlyReadyEvents.push(nextEvent);
    return nextEvent;
  });

  return {
    state: {
      ...materialized,
      calendarEvents: nextEvents,
    },
    newlyReadyEvents,
  };
};

export const cancelCalendarSeriesEvents = ({
  state,
  seriesId,
  currentDayIndex = 0,
  cancelStartedEvents = false,
}) => {
  const normalized = normalizeCalendarState(state, state?.calendarEpochGameTimeMs);
  const targetSeriesId = String(seriesId || "").trim();
  if (!targetSeriesId) return normalized;
  const cancellableStatuses = new Set([
    CALENDAR_STATUS.SCHEDULED,
    CALENDAR_STATUS.READY,
    ...(cancelStartedEvents ? [CALENDAR_STATUS.RUNNING] : []),
  ]);
  return {
    ...normalized,
    calendarSeries: normalized.calendarSeries.map((series) =>
      series.id === targetSeriesId ? { ...series, active: false } : series,
    ),
    calendarEvents: normalized.calendarEvents.map((event) =>
      event.seriesId === targetSeriesId &&
      event.scheduledDayIndex >= currentDayIndex &&
      cancellableStatuses.has(event.status)
        ? { ...event, status: CALENDAR_STATUS.CANCELLED }
        : event,
    ),
  };
};

export const getDungeonMissionPreemption = ({ activeMissions, memberIds }) => {
  const selectedMemberIds = new Set(normalizeIdList(memberIds));
  const canceledMissions = [];
  const affectedMemberIds = new Set();

  (Array.isArray(activeMissions) ? activeMissions : []).forEach((mission) => {
    if (mission?.type !== "dungeon") return;
    const missionMemberIds = normalizeIdList(mission?.memberIds);
    if (!missionMemberIds.some((memberId) => selectedMemberIds.has(memberId))) return;
    canceledMissions.push({
      missionKey: getMissionInstanceKey(mission),
      missionName: String(mission?.name || "Dungeon"),
      memberIds: missionMemberIds,
    });
    missionMemberIds.forEach((memberId) => affectedMemberIds.add(memberId));
  });

  return {
    canceledMissions,
    affectedMemberIds: [...affectedMemberIds],
  };
};
