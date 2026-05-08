import { useEffect, useMemo, useState } from "react";
import { DB_CLASSES } from "../../constants";
import {
  CALENDAR_MONTHS,
  CALENDAR_SERIES_DURATION_OPTIONS,
  CALENDAR_SERIES_TYPE,
  CALENDAR_STATUS,
  CALENDAR_TIME_OF_DAY_OPTIONS,
  CALENDAR_WEEKDAYS,
  formatCalendarDate,
  getCalendarDate,
  getCalendarTimeOfDayOption,
  getCalendarMonthGrid,
} from "../../calendar/calendarLogic";
import {
  formatRaidResetSchedule,
  getRaidLockoutStatus,
} from "../../raids/raidLockouts";
import { getCharacterAverageItemLevel, getRoleIcon } from "../../utils";
import BaseModal from "./BaseModal";

const getMissionRoleRequirement = (mission) => ({
  Tank: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.Tank) || 0)),
  Healer: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.Healer) || 0)),
  DPS: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.DPS) || 0)),
});

const getRoleCounts = (members) =>
  (Array.isArray(members) ? members : []).reduce(
    (counts, member) => ({
      ...counts,
      [member.role]: (counts[member.role] || 0) + 1,
    }),
    { Tank: 0, Healer: 0, DPS: 0 },
  );

const getEventStatusClass = (status) => {
  if (status === CALENDAR_STATUS.READY) return "border-emerald-600 text-emerald-200";
  if (status === CALENDAR_STATUS.RUNNING) return "border-blue-600 text-blue-200";
  if (status === CALENDAR_STATUS.COMPLETED) return "border-gray-600 text-gray-400";
  if (status === CALENDAR_STATUS.CANCELLED) return "border-red-700 text-red-300";
  return "border-yellow-700 text-yellow-200";
};

const getRaidResetShortLabel = (mission) => {
  if (mission?.name === "Molten Core") return "MC Reset";
  if (mission?.name === "Zul'Gurub") return "ZG Reset";
  if (mission?.name === "Ruins of Ahn'Qiraj") return "AQ20 Reset";
  if (mission?.name === "Temple of Ahn'Qiraj") return "AQ40 Reset";
  return `${mission?.name || "Raid"} Reset`;
};

const isRaidResetDay = (mission, dayIndex) => {
  if (mission?.isRaid !== true) return false;
  const schedule = mission.raidReset || {};
  if (schedule.type === "interval") {
    const intervalDays = Math.max(1, Math.floor(Number(schedule.intervalDays) || 1));
    const anchorDayIndex = Math.max(0, Math.floor(Number(schedule.anchorDayIndex) || 0));
    return dayIndex >= anchorDayIndex && (dayIndex - anchorDayIndex) % intervalDays === 0;
  }
  const weekday = Math.max(0, Math.min(6, Math.floor(Number(schedule.weekday) || 2)));
  return getCalendarDate(dayIndex).weekdayIndex === weekday;
};

const CalendarModal = ({
  isOpen,
  onClose,
  calendarState,
  currentDayIndex,
  missionList,
  roster,
  activeMissions,
  raidLockouts,
  onCreateEvent,
  onCreateSeries,
  onUpdateEventRoster,
  onCancelEvent,
  onCancelSeries,
  onStartEvent,
}) => {
  const currentDate = getCalendarDate(currentDayIndex);
  const raidMissions = useMemo(
    () => (Array.isArray(missionList) ? missionList : []).filter((mission) => mission?.isRaid),
    [missionList],
  );
  const defaultMissionId =
    raidMissions.find((mission) => mission.name === "Molten Core")?.id ||
    raidMissions[0]?.id ||
    "";
  const [viewYear, setViewYear] = useState(currentDate.year);
  const [viewMonthIndex, setViewMonthIndex] = useState(currentDate.monthIndex);
  const [selectedDayIndex, setSelectedDayIndex] = useState(currentDayIndex);
  const [selectedMissionId, setSelectedMissionId] = useState(defaultMissionId);
  const [selectedWeekday, setSelectedWeekday] = useState(currentDate.weekdayIndex);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState("evening");
  const [selectedDurationWeeks, setSelectedDurationWeeks] = useState(8);
  const [eventTitle, setEventTitle] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setViewYear(currentDate.year);
    setViewMonthIndex(currentDate.monthIndex);
    setSelectedDayIndex(currentDayIndex);
    setSelectedMissionId(defaultMissionId);
    setSelectedWeekday(currentDate.weekdayIndex);
    setSelectedTimeOfDay("evening");
    setSelectedDurationWeeks(8);
    setEventTitle("");
    setSelectedEventId(null);
  }, [
    currentDate.monthIndex,
    currentDate.weekdayIndex,
    currentDate.year,
    currentDayIndex,
    defaultMissionId,
    isOpen,
  ]);

  const events = useMemo(
    () =>
      Array.isArray(calendarState?.calendarEvents)
        ? calendarState.calendarEvents
        : [],
    [calendarState?.calendarEvents],
  );
  const series = useMemo(
    () =>
      Array.isArray(calendarState?.calendarSeries)
        ? calendarState.calendarSeries
        : [],
    [calendarState?.calendarSeries],
  );
  const missionLookup = useMemo(
    () =>
      new Map(
        (Array.isArray(missionList) ? missionList : []).map((mission) => [
          String(mission.id),
          mission,
        ]),
      ),
    [missionList],
  );
  const rosterLookup = useMemo(
    () =>
      new Map(
        (Array.isArray(roster) ? roster : []).map((member) => [member.id, member]),
      ),
    [roster],
  );
  const activeMemberIds = useMemo(
    () =>
      new Set(
        (Array.isArray(activeMissions) ? activeMissions : []).flatMap((mission) =>
          Array.isArray(mission.memberIds) ? mission.memberIds : [],
        ),
      ),
    [activeMissions],
  );
  const monthGrid = getCalendarMonthGrid(viewYear, viewMonthIndex);
  const eventsByDay = useMemo(() => {
    const grouped = new Map();
    events.forEach((event) => {
      if (!grouped.has(event.scheduledDayIndex)) grouped.set(event.scheduledDayIndex, []);
      grouped.get(event.scheduledDayIndex).push(event);
    });
    return grouped;
  }, [events]);
  const raidResetLabelsByDay = useMemo(() => {
    const grouped = new Map();
    monthGrid.forEach((day) => {
      if (!day) return;
      const resetLabels = raidMissions
        .filter((mission) => isRaidResetDay(mission, day.dayIndex))
        .map(getRaidResetShortLabel);
      if (resetLabels.length > 0) grouped.set(day.dayIndex, resetLabels);
    });
    return grouped;
  }, [monthGrid, raidMissions]);
  const visibleEvents = [...events]
    .filter((event) => event.scheduledDayIndex >= currentDayIndex - 7)
    .sort((left, right) => left.scheduledDayIndex - right.scheduledDayIndex);
  const selectedDayEvents = [...(eventsByDay.get(selectedDayIndex) || [])].sort(
    (left, right) =>
      CALENDAR_TIME_OF_DAY_OPTIONS.findIndex(
        (option) => option.value === left.scheduledTimeOfDay,
      ) -
        CALENDAR_TIME_OF_DAY_OPTIONS.findIndex(
          (option) => option.value === right.scheduledTimeOfDay,
        ),
  );
  const selectedDayResetLabels = raidResetLabelsByDay.get(selectedDayIndex) || [];
  const selectedDayHasDetails =
    selectedDayEvents.length > 0 || selectedDayResetLabels.length > 0;
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ||
    selectedDayEvents[0] ||
    visibleEvents[0] ||
    null;
  const selectedEventMission = selectedEvent
    ? missionLookup.get(String(selectedEvent.missionId))
    : null;
  const signupMembers = selectedEvent
    ? selectedEvent.registrations
        .map((id) => rosterLookup.get(id))
        .filter(Boolean)
    : [];
  const approvedMembers = selectedEvent
    ? selectedEvent.approvedRosterIds
        .map((id) => rosterLookup.get(id))
        .filter(Boolean)
    : [];
  const roleCounts = getRoleCounts(approvedMembers);
  const roleRequirement = getMissionRoleRequirement(selectedEventMission);
  const minPartySize = selectedEventMission?.isRaid
    ? Math.max(1, Number(selectedEventMission?.minPartySize) || 5)
    : 1;
  const maxPartySize = Math.max(
    1,
    Number(selectedEventMission?.requiredPartySize) ||
      (selectedEventMission?.isRaid ? 40 : 5),
  );
  const hasMinimumRoster = approvedMembers.length >= minPartySize;
  const hasRoleCoverage =
    roleCounts.Tank >= roleRequirement.Tank &&
    roleCounts.Healer >= roleRequirement.Healer &&
    roleCounts.DPS >= roleRequirement.DPS;
  const selectedEventLockoutStatus = selectedEventMission
    ? getRaidLockoutStatus({
        raidLockouts,
        mission: selectedEventMission,
        currentDayIndex,
        memberIds: selectedEvent?.approvedRosterIds || [],
      })
    : null;

  const changeMonth = (delta) => {
    const nextMonth = viewMonthIndex + delta;
    if (nextMonth < 0) {
      setViewMonthIndex(11);
      setViewYear((prev) => Math.max(1, prev - 1));
      return;
    }
    if (nextMonth > 11) {
      setViewMonthIndex(0);
      setViewYear((prev) => prev + 1);
      return;
    }
    setViewMonthIndex(nextMonth);
  };

  const handleCreateEvent = () => {
    if (!selectedMissionId) return;
    const mission = missionLookup.get(String(selectedMissionId));
    onCreateEvent({
      missionId: selectedMissionId,
      scheduledDayIndex: selectedDayIndex,
      scheduledTimeOfDay: selectedTimeOfDay,
      title: eventTitle.trim() || mission?.name || "Raid Event",
    });
    setEventTitle("");
  };

  const handleCreateSeries = () => {
    if (!selectedMissionId) return;
    const mission = missionLookup.get(String(selectedMissionId));
    const startDay =
      selectedDayIndex >= currentDayIndex ? selectedDayIndex : currentDayIndex;
    const isIntervalRaid = mission?.raidReset?.type === "interval";
    onCreateSeries({
      missionId: selectedMissionId,
      weekday: selectedWeekday,
      scheduledTimeOfDay: selectedTimeOfDay,
      startsOnDayIndex: startDay,
      seriesType: isIntervalRaid
        ? CALENDAR_SERIES_TYPE.INTERVAL
        : CALENDAR_SERIES_TYPE.WEEKLY,
      intervalDays: isIntervalRaid ? mission.raidReset.intervalDays : undefined,
      durationWeeks: selectedDurationWeeks,
      title:
        eventTitle.trim() ||
        (isIntervalRaid
          ? `${mission?.name || "Raid"} Reset`
          : `${mission?.name || "Raid"} ${CALENDAR_WEEKDAYS[selectedWeekday]}`),
    });
    setEventTitle("");
  };

  const toggleApproved = (characterId) => {
    if (!selectedEvent) return;
    const approved = selectedEvent.approvedRosterIds.includes(characterId)
      ? selectedEvent.approvedRosterIds.filter((id) => id !== characterId)
      : [...selectedEvent.approvedRosterIds, characterId].slice(0, maxPartySize);
    onUpdateEventRoster(selectedEvent.id, approved);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-indigo-800 rounded-none md:rounded-lg w-full max-w-6xl h-full md:h-[86vh] flex flex-col relative shadow-2xl"
    >
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white fantasy-font">
            Guild Calendar
          </h2>
          <p className="text-xs text-cyan-200/80 mt-1">
            Today: {formatCalendarDate(currentDayIndex)}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl px-2">
          &times;
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-h-0 overflow-y-auto p-4 custom-scrollbar border-b lg:border-b-0 lg:border-r border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="px-3 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
            >
              Prev
            </button>
            <h3 className="font-bold text-amber-100">
              {CALENDAR_MONTHS[viewMonthIndex].name}, Year {viewYear}
            </h3>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="px-3 py-1 rounded border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700"
            >
              Next
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400 uppercase tracking-wide mb-1">
            {CALENDAR_WEEKDAYS.map((weekday) => (
              <div key={weekday}>{weekday.slice(0, 3)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              const dayEvents = eventsByDay.get(day.dayIndex) || [];
              const dayResetLabels = raidResetLabelsByDay.get(day.dayIndex) || [];
              const isToday = day.dayIndex === currentDayIndex;
              const isSelected = day.dayIndex === selectedDayIndex;
              return (
                <button
                  key={day.dayIndex}
                  type="button"
                  onClick={() => {
                    setSelectedDayIndex(day.dayIndex);
                    const firstEvent = (eventsByDay.get(day.dayIndex) || [])[0];
                    if (firstEvent) setSelectedEventId(firstEvent.id);
                  }}
                  className={`aspect-square rounded border p-1 text-left text-xs overflow-hidden ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-950/50"
                      : isToday
                        ? "border-cyan-500 bg-cyan-950/30"
                        : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  <div className="font-bold text-gray-100">{day.dayOfMonth}</div>
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`truncate rounded border px-1 text-[10px] ${getEventStatusClass(event.status)}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length < 2 &&
                      dayResetLabels.slice(0, 2 - dayEvents.length).map((label) => (
                        <div
                          key={`${day.dayIndex}-${label}`}
                          className="truncate rounded border border-amber-700/70 bg-amber-950/40 px-1 text-[10px] font-bold text-amber-100"
                        >
                          {label}
                        </div>
                      ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-gray-400">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded border border-gray-700 bg-black/20 p-3 space-y-3">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
              Create Raid Event
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-xs text-gray-300">
                <span className="block mb-1 text-gray-500 uppercase tracking-wide">Raid</span>
                <select
                  value={selectedMissionId}
                  onChange={(event) => setSelectedMissionId(event.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                >
                  {raidMissions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-300">
                <span className="block mb-1 text-gray-500 uppercase tracking-wide">Title</span>
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                  placeholder="Molten Core Raid"
                />
              </label>
              <label className="text-xs text-gray-300">
                <span className="block mb-1 text-gray-500 uppercase tracking-wide">Start</span>
                <select
                  value={selectedTimeOfDay}
                  onChange={(event) => setSelectedTimeOfDay(event.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                >
                  {CALENDAR_TIME_OF_DAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="text-xs text-gray-400">
                Selected date:{" "}
                <span className="text-cyan-200">{formatCalendarDate(selectedDayIndex)}</span>
              </div>
              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={!selectedMissionId}
                className="ml-auto px-3 py-2 rounded border border-cyan-700 bg-cyan-950/40 text-cyan-100 font-bold text-xs disabled:opacity-40"
              >
                Create One-Off
              </button>
              <label className="text-xs text-gray-300">
                <span className="block mb-1 text-gray-500 uppercase tracking-wide">Weekly</span>
                <select
                  value={selectedWeekday}
                  onChange={(event) => setSelectedWeekday(Number(event.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                >
                  {CALENDAR_WEEKDAYS.map((weekday, index) => (
                    <option key={weekday} value={index}>
                      {weekday}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-300">
                <span className="block mb-1 text-gray-500 uppercase tracking-wide">Length</span>
                <select
                  value={selectedDurationWeeks}
                  onChange={(event) =>
                    setSelectedDurationWeeks(Number(event.target.value))
                  }
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                >
                  {CALENDAR_SERIES_DURATION_OPTIONS.map((weeks) => (
                    <option key={weeks} value={weeks}>
                      {weeks} weeks
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleCreateSeries}
                disabled={!selectedMissionId}
                className="px-3 py-2 rounded border border-indigo-700 bg-indigo-950/40 text-indigo-100 font-bold text-xs disabled:opacity-40"
              >
                {missionLookup.get(String(selectedMissionId))?.raidReset?.type === "interval"
                  ? `Create Every ${
                      missionLookup.get(String(selectedMissionId))?.raidReset
                        ?.intervalDays || 3
                    }d`
                  : "Create Weekly"}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded border border-gray-700 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide">
                  Selected Day
                </h3>
                <div className="mt-1 text-xs text-cyan-200">
                  {formatCalendarDate(selectedDayIndex)}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {selectedDayEvents.length} schedule
                {selectedDayEvents.length === 1 ? "" : "s"}
              </div>
            </div>

            {!selectedDayHasDetails ? (
              <div className="mt-3 text-sm text-gray-500 italic">
                No raids or resets are planned for this day.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className={`w-full rounded border p-2 text-left bg-gray-800 hover:bg-gray-700 ${
                      selectedEvent?.id === event.id
                        ? "border-indigo-500"
                        : "border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-100">{event.title}</span>
                      <span className={`text-[10px] uppercase ${getEventStatusClass(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {getCalendarTimeOfDayOption(event.scheduledTimeOfDay).label}
                    </div>
                  </button>
                ))}
                {selectedDayResetLabels.map((label) => (
                  <div
                    key={`${selectedDayIndex}-${label}-detail`}
                    className="rounded border border-amber-800/70 bg-amber-950/30 p-2 text-xs font-bold text-amber-100"
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 custom-scrollbar">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide mb-2">
              Upcoming Events
            </h3>
            <div className="space-y-2">
              {visibleEvents.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No raid events planned.</div>
              ) : (
                visibleEvents.slice(0, 12).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className={`w-full text-left rounded border p-2 bg-gray-800 hover:bg-gray-700 ${
                      selectedEvent?.id === event.id
                        ? "border-indigo-500"
                        : "border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-100">{event.title}</span>
                      <span className={`text-[10px] uppercase ${getEventStatusClass(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatCalendarDate(event.scheduledDayIndex)} -{" "}
                      {getCalendarTimeOfDayOption(event.scheduledTimeOfDay).label}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {selectedEvent && (
            <div className="rounded border border-gray-700 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-amber-100">{selectedEvent.title}</h3>
                  <div className="text-xs text-gray-400">
                    {formatCalendarDate(selectedEvent.scheduledDayIndex)} -{" "}
                    {getCalendarTimeOfDayOption(selectedEvent.scheduledTimeOfDay).label}
                  </div>
                </div>
                <span className={`text-xs uppercase ${getEventStatusClass(selectedEvent.status)}`}>
                  {selectedEvent.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded border border-gray-700 bg-gray-900/70 p-2">
                  <div className="text-gray-500 uppercase tracking-wide">Signups</div>
                  <div className="text-lg font-bold text-gray-100">{signupMembers.length}</div>
                </div>
                <div className="rounded border border-gray-700 bg-gray-900/70 p-2">
                  <div className="text-gray-500 uppercase tracking-wide">Approved</div>
                  <div className="text-lg font-bold text-gray-100">
                    {approvedMembers.length}/{maxPartySize}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded border border-cyan-900/60 bg-cyan-950/20 p-2 text-xs text-cyan-100/80">
                Auto-start: {getCalendarTimeOfDayOption(selectedEvent.scheduledTimeOfDay).label}
                {selectedEvent.autoStart === false ? " disabled" : ""}. Lock the roster before
                that time and the raid will start automatically.
              </div>
              {selectedEventMission?.isRaid && (
                <div className="mt-3 rounded border border-amber-900/60 bg-amber-950/20 p-2 text-xs text-amber-100/80">
                  {formatRaidResetSchedule(selectedEventMission)}
                  {selectedEventLockoutStatus?.lockout
                    ? ` - ID ${selectedEventLockoutStatus.lockout.displayId}: ${selectedEventLockoutStatus.clearedSteps}/${selectedEventLockoutStatus.totalBosses} bosses cleared`
                    : ""}
                  {selectedEventLockoutStatus?.isCompletedLocked
                    ? ` - cleared until day ${selectedEventLockoutStatus.resetWindow.nextResetDayIndex}`
                    : ""}
                  {selectedEventLockoutStatus?.hasLockoutConflict
                    ? " - conflicting raid IDs selected"
                    : ""}
                </div>
              )}

              <div className="mt-3 rounded border border-gray-700 bg-gray-900/70 p-2 text-xs">
                <div className="text-gray-500 uppercase tracking-wide mb-1">Raid Comp</div>
                <div className={hasRoleCoverage ? "text-emerald-300" : "text-amber-200"}>
                  Tank {roleCounts.Tank}/{roleRequirement.Tank} - Healer{" "}
                  {roleCounts.Healer}/{roleRequirement.Healer} - DPS {roleCounts.DPS}/
                  {roleRequirement.DPS}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Signups
                </h4>
                {signupMembers.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No eligible signups yet.</div>
                ) : (
                  signupMembers.map((member) => {
                    const approved = selectedEvent.approvedRosterIds.includes(member.id);
                    const busy = activeMemberIds.has(member.id);
                    const memberRaidStatus = selectedEventMission?.isRaid
                      ? getRaidLockoutStatus({
                          raidLockouts,
                          mission: selectedEventMission,
                          currentDayIndex,
                          memberIds: [member.id],
                        })
                      : null;
                    const memberRaidLockout = memberRaidStatus?.partyLockouts?.[0] || null;
                    const raidLocked = Boolean(memberRaidStatus?.isCompletedLocked);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleApproved(member.id)}
                        disabled={
                          selectedEvent.status === CALENDAR_STATUS.RUNNING ||
                          selectedEvent.status === CALENDAR_STATUS.COMPLETED ||
                          selectedEvent.status === CALENDAR_STATUS.CANCELLED
                        }
                        className={`w-full rounded border p-2 text-left flex items-center justify-between gap-2 ${
                          approved
                            ? "border-emerald-700 bg-emerald-950/30"
                            : "border-gray-700 bg-gray-800"
                        } disabled:opacity-60`}
                      >
                        <span>
                          <span
                            className="font-bold"
                            style={{ color: DB_CLASSES[member.charClass]?.color }}
                          >
                            {member.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {getRoleIcon(member.role)} {member.charClass} Lvl {member.level} - iLvl{" "}
                            {getCharacterAverageItemLevel(member).toFixed(1)}
                          </span>
                        </span>
                        <span className="text-xs text-gray-300">
                          {raidLocked
                            ? "Locked"
                            : memberRaidLockout
                              ? `ID ${memberRaidLockout.displayId}`
                              : busy
                                ? "Busy"
                                : approved
                                  ? "Roster"
                                  : "Bench"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => onCancelEvent(selectedEvent.id)}
                  disabled={
                    selectedEvent.status === CALENDAR_STATUS.RUNNING ||
                    selectedEvent.status === CALENDAR_STATUS.COMPLETED ||
                    selectedEvent.status === CALENDAR_STATUS.CANCELLED
                  }
                  className="px-3 py-2 rounded border border-red-800 bg-red-950/30 text-red-200 text-xs font-bold disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onStartEvent(selectedEvent.id)}
                  disabled={
                    selectedEvent.status !== CALENDAR_STATUS.READY ||
                    !hasMinimumRoster ||
                    selectedEventLockoutStatus?.isCompletedLocked ||
                    selectedEventLockoutStatus?.hasLockoutConflict
                  }
                  className="px-4 py-2 rounded border border-emerald-700 bg-emerald-950/40 text-emerald-100 text-xs font-bold disabled:opacity-40"
                >
                  Start Raid
                </button>
              </div>
            </div>
          )}

          {series.length > 0 && (
            <div className="mt-4 rounded border border-gray-700 bg-black/20 p-3">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide mb-2">
                Weekly Series
              </h3>
              <div className="space-y-2 text-xs text-gray-300">
                {series.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded border border-gray-700 bg-gray-900/70 p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-gray-100">{entry.title}</div>
                        <div className="mt-1 text-gray-500">
                          {entry.seriesType === CALENDAR_SERIES_TYPE.INTERVAL
                            ? `Every ${entry.intervalDays} days`
                            : CALENDAR_WEEKDAYS[entry.weekday]}
                          {" - "}
                          {entry.durationWeeks} weeks
                        </div>
                      </div>
                      <span
                        className={
                          entry.active
                            ? "text-[10px] uppercase text-emerald-300"
                            : "text-[10px] uppercase text-red-300"
                        }
                      >
                        {entry.active ? "Active" : "Cancelled"}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onCancelSeries(entry.id)}
                        disabled={!entry.active}
                        className="rounded border border-red-800 bg-red-950/30 px-3 py-1.5 text-xs font-bold text-red-200 disabled:opacity-40"
                      >
                        Cancel Series
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default CalendarModal;
