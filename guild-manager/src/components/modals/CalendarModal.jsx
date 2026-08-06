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
import {
  getCharacterAverageItemLevel,
  getMissionSuccessPreview,
  getMissionVeteranCoverage,
  getRoleIcon,
} from "../../utils";
import { getPartyMoraleSuccessBonus } from "../../game/characterMorale";
import BaseModal from "./BaseModal";
import {
  CALENDAR_AUTO_SELECT_MODE_LABEL,
  CALENDAR_AUTO_SELECT_MODE_OPTIONS,
  CALENDAR_AUTO_SELECT_MODES,
  getEventMissionIds,
  getEventStatusClass,
  getMissionRoleRequirement,
  getRaidMissionOptions,
  getRaidResetShortLabel,
  getRoleCounts,
  isRaidResetDay,
  isTerminalEventStatus,
  sortRaidWingsByProgression,
} from "../calendar/calendarViewModel";

const CalendarModal = ({
  isOpen,
  onClose,
  variant = "modal",
  calendarState,
  currentDayIndex,
  missionList,
  roster,
  activeMissions,
  raidLockouts,
  dungeonSuccessBonus = 0,
  onCreateEvent,
  onCreateSeries,
  onUpdateEventRoster,
  onLockEventRoster,
  onCancelEvent,
  onCancelSeries,
  onStartEvent,
}) => {
  const isPage = variant === "page";
  const isActive = isPage || isOpen;
  const currentDate = getCalendarDate(currentDayIndex);
  const raidMissions = useMemo(
    () => (Array.isArray(missionList) ? missionList : []).filter((mission) => mission?.isRaid),
    [missionList],
  );
  const raidMissionOptions = useMemo(
    () => getRaidMissionOptions(raidMissions),
    [raidMissions],
  );
  const defaultMissionId =
    raidMissionOptions.find((option) => option.label === "Molten Core")?.missionId ||
    raidMissionOptions[0]?.missionId ||
    "";
  const [viewYear, setViewYear] = useState(currentDate.year);
  const [viewMonthIndex, setViewMonthIndex] = useState(currentDate.monthIndex);
  const [selectedDayIndex, setSelectedDayIndex] = useState(currentDayIndex);
  const [selectedMissionId, setSelectedMissionId] = useState(defaultMissionId);
  const [selectedMissionIds, setSelectedMissionIds] = useState(
    raidMissionOptions.find((option) => String(option.missionId) === String(defaultMissionId))
      ?.missions.map((mission) => mission.id) || (defaultMissionId ? [defaultMissionId] : []),
  );
  const [selectedWeekday, setSelectedWeekday] = useState(currentDate.weekdayIndex);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState("evening");
  const [selectedDurationWeeks, setSelectedDurationWeeks] = useState(8);
  const [eventTitle, setEventTitle] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [autoSelectMode, setAutoSelectMode] = useState(
    CALENDAR_AUTO_SELECT_MODES.MAX_SUCCESS,
  );
  const [autoSelectSummary, setAutoSelectSummary] = useState("");

  useEffect(() => {
    if (!isActive) return;
    setViewYear(currentDate.year);
    setViewMonthIndex(currentDate.monthIndex);
    setSelectedDayIndex(currentDayIndex);
    setSelectedMissionId(defaultMissionId);
    setSelectedMissionIds(
      raidMissionOptions
        .find((option) => String(option.missionId) === String(defaultMissionId))
        ?.missions.map((mission) => mission.id) ||
        (defaultMissionId ? [defaultMissionId] : []),
    );
    setSelectedWeekday(currentDate.weekdayIndex);
    setSelectedTimeOfDay("evening");
    setSelectedDurationWeeks(8);
    setEventTitle("");
    setSelectedEventId(null);
    setAutoSelectMode(CALENDAR_AUTO_SELECT_MODES.MAX_SUCCESS);
    setAutoSelectSummary("");
  }, [
    currentDate.monthIndex,
    currentDate.weekdayIndex,
    currentDate.year,
    currentDayIndex,
    defaultMissionId,
    isActive,
    raidMissionOptions,
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
  const selectedRaidOption = useMemo(
    () =>
      raidMissionOptions.find(
        (option) => String(option.missionId) === String(selectedMissionId),
      ) || null,
    [raidMissionOptions, selectedMissionId],
  );
  const selectedRaidWingMissions = selectedRaidOption?.missions || [];
  const selectedRaidMissionIdSet = new Set(selectedMissionIds.map((id) => String(id)));
  const selectedRaidChainMissionIds = selectedRaidWingMissions
    .filter((mission) => selectedRaidMissionIdSet.has(String(mission.id)))
    .map((mission) => mission.id);
  const selectedRaidIsFullRun =
    selectedRaidWingMissions.length > 1 &&
    selectedRaidChainMissionIds.length === selectedRaidWingMissions.length;
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
      const resetLabels = raidMissionOptions
        .map((option) => option.missions[0])
        .filter((mission) => isRaidResetDay(mission, day.dayIndex))
        .map(getRaidResetShortLabel);
      if (resetLabels.length > 0) grouped.set(day.dayIndex, resetLabels);
    });
    return grouped;
  }, [monthGrid, raidMissionOptions]);
  const visibleEvents = [...events]
    .filter(
      (event) =>
        event.scheduledDayIndex >= currentDayIndex &&
        !isTerminalEventStatus(event.status),
    )
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
  const selectedEventMissions = selectedEvent
    ? getEventMissionIds(selectedEvent)
        .map((missionId) => missionLookup.get(String(missionId)))
        .filter(Boolean)
        .sort(sortRaidWingsByProgression)
    : [];
  const selectedEventRaidOption =
    selectedEventMissions.length > 0
      ? raidMissionOptions.find((option) =>
          option.missions.some(
            (mission) => String(mission.id) === String(selectedEventMissions[0].id),
          ),
        ) || null
      : null;
  const selectedEventRunLabel =
    selectedEventMissions.length > 1
      ? `${selectedEventMissions.length === selectedEventRaidOption?.missions.length ? "Full run" : `${selectedEventMissions.length} wings`}: ${selectedEventMissions
          .map((mission) => mission.dungeonWing || mission.name)
          .join(" + ")}`
      : selectedEventMissions[0]?.dungeonWing || selectedEventMission?.name || "";
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
        currentDayIndex: selectedEvent?.scheduledDayIndex ?? currentDayIndex,
        memberIds: selectedEvent?.approvedRosterIds || [],
      })
    : null;
  const isSelectedEventEditable =
    Boolean(selectedEvent) &&
    selectedEvent.status !== CALENDAR_STATUS.RUNNING &&
    selectedEvent.status !== CALENDAR_STATUS.COMPLETED &&
    selectedEvent.status !== CALENDAR_STATUS.CANCELLED &&
    selectedEvent.rosterLocked !== true;

  useEffect(() => {
    setAutoSelectSummary("");
  }, [selectedEvent?.id]);

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

  const selectRaidMissionOption = (missionId) => {
    const option =
      raidMissionOptions.find(
        (entry) => String(entry.missionId) === String(missionId),
      ) || null;
    setSelectedMissionId(missionId);
    setSelectedMissionIds(
      option?.missions.map((mission) => mission.id) || (missionId ? [missionId] : []),
    );
  };

  const selectFullRaidRun = () => {
    if (!selectedRaidOption) return;
    setSelectedMissionIds(selectedRaidOption.missions.map((mission) => mission.id));
  };

  const toggleSelectedRaidWing = (missionId) => {
    setSelectedMissionIds((currentIds) => {
      const current = new Set(currentIds.map((id) => String(id)));
      const key = String(missionId);
      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
      }
      const nextIds = selectedRaidWingMissions
        .filter((mission) => current.has(String(mission.id)))
        .map((mission) => mission.id);
      return nextIds.length > 0 ? nextIds : [missionId];
    });
  };

  const handleCreateEvent = () => {
    if (!selectedMissionId) return;
    const missionIds =
      selectedRaidChainMissionIds.length > 0
        ? selectedRaidChainMissionIds
        : [selectedMissionId];
    const primaryMissionId = missionIds[0] || selectedMissionId;
    const mission = missionLookup.get(String(primaryMissionId));
    const createdEvent = onCreateEvent({
      missionId: primaryMissionId,
      missionIds,
      scheduledDayIndex: selectedDayIndex,
      scheduledTimeOfDay: selectedTimeOfDay,
      title:
        eventTitle.trim() ||
        (selectedRaidIsFullRun
          ? `${mission?.dungeonSetName || mission?.name || "Raid"} Full Run`
          : missionIds.length > 1
            ? `${mission?.dungeonSetName || mission?.name || "Raid"} ${missionIds.length} Wings`
          : mission?.dungeonWing || mission?.name || "Raid Event"),
    });
    if (createdEvent === false) return;
    setSelectedMissionId("");
    setSelectedMissionIds([]);
    setEventTitle("");
  };

  const handleCreateSeries = () => {
    if (!selectedMissionId) return;
    const missionIds =
      selectedRaidChainMissionIds.length > 0
        ? selectedRaidChainMissionIds
        : [selectedMissionId];
    const primaryMissionId = missionIds[0] || selectedMissionId;
    const mission = missionLookup.get(String(primaryMissionId));
    const startDay =
      selectedDayIndex >= currentDayIndex ? selectedDayIndex : currentDayIndex;
    const isIntervalRaid = mission?.raidReset?.type === "interval";
    const createdSeries = onCreateSeries({
      missionId: primaryMissionId,
      missionIds,
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
          ? `${mission?.dungeonSetName || mission?.name || "Raid"} Reset`
          : `${mission?.dungeonSetName || mission?.name || "Raid"} ${CALENDAR_WEEKDAYS[selectedWeekday]}`),
    });
    if (createdSeries === false) return;
    setSelectedMissionId("");
    setSelectedMissionIds([]);
    setEventTitle("");
  };

  const toggleApproved = (characterId) => {
    if (!selectedEvent) return;
    if (selectedEvent.rosterLocked) return;
    const approved = selectedEvent.approvedRosterIds.includes(characterId)
      ? selectedEvent.approvedRosterIds.filter((id) => id !== characterId)
      : [...selectedEvent.approvedRosterIds, characterId].slice(0, maxPartySize);
    onUpdateEventRoster(selectedEvent.id, approved);
  };

  const getAdjustedCalendarMissionPreview = (mission, members) => {
    const preview = getMissionSuccessPreview(mission, members);
    const focusSuccessBonus =
      mission?.type === "dungeon" ? Math.max(0, dungeonSuccessBonus) : 0;
    const veteranCoverage = getMissionVeteranCoverage(mission, members);
    const moraleSuccessBonus =
      mission?.type === "dungeon" ? getPartyMoraleSuccessBonus(members) : 0;
    const successChance = Math.min(
      100,
      Math.max(
        0,
        preview.successChance +
          focusSuccessBonus +
          veteranCoverage.successBonus +
          moraleSuccessBonus,
      ),
    );
    return {
      ...preview,
      successChance,
      failChance: Math.max(0, 100 - successChance),
      focusSuccessBonus,
      veteranSuccessBonus: veteranCoverage.successBonus,
      moraleSuccessBonus,
    };
  };
  const approvedRosterPreview = selectedEventMission
    ? getAdjustedCalendarMissionPreview(
        selectedEventMission,
        approvedMembers,
      )
    : null;
  const approvedRosterSuccessChance =
    approvedRosterPreview?.successChance ?? 0;
  const approvedRosterSuccessClass =
    approvedRosterSuccessChance >= 75
      ? "text-emerald-300"
      : approvedRosterSuccessChance >= 45
        ? "text-amber-200"
        : "text-red-300";

  const handleAutoSelectRoster = () => {
    if (!selectedEvent || !selectedEventMission || !isSelectedEventEditable) return;
    const candidates = signupMembers.filter(Boolean);
    if (candidates.length === 0) {
      setAutoSelectSummary("No eligible signups available.");
      return;
    }

    const targetRosterSize = Math.min(maxPartySize, candidates.length);
    const roleRequirementForMission = getMissionRoleRequirement(selectedEventMission);
    const selectedMembers = [];
    const selectedMemberIds = new Set();
    const getSupportScore = (member) =>
      (Number(member?.level) || 1) * 3 + getCharacterAverageItemLevel(member);
    const getSelectedRoleCount = (role) =>
      selectedMembers.filter((member) => member.role === role).length;
    const tryAddMember = (member) => {
      if (!member || selectedMemberIds.has(member.id)) return false;
      if (selectedMembers.length >= targetRosterSize) return false;
      selectedMembers.push(member);
      selectedMemberIds.add(member.id);
      return true;
    };
    const compareCandidate = (left, right) => {
      const leftRoleNeeded =
        getSelectedRoleCount(left.role) < (roleRequirementForMission[left.role] || 0);
      const rightRoleNeeded =
        getSelectedRoleCount(right.role) < (roleRequirementForMission[right.role] || 0);
      if (autoSelectMode === CALENDAR_AUTO_SELECT_MODES.ROLE_COVERAGE) {
        if (Number(rightRoleNeeded) !== Number(leftRoleNeeded)) {
          return Number(rightRoleNeeded) - Number(leftRoleNeeded);
        }
      }
      const leftPreview = getAdjustedCalendarMissionPreview(selectedEventMission, [
        ...selectedMembers,
        left,
      ]);
      const rightPreview = getAdjustedCalendarMissionPreview(selectedEventMission, [
        ...selectedMembers,
        right,
      ]);
      if (autoSelectMode !== CALENDAR_AUTO_SELECT_MODES.STRONGEST) {
        if (rightPreview.successChance !== leftPreview.successChance) {
          return rightPreview.successChance - leftPreview.successChance;
        }
      }
      const supportDiff = getSupportScore(right) - getSupportScore(left);
      if (supportDiff !== 0) return supportDiff;
      return String(left?.name || "").localeCompare(String(right?.name || ""));
    };
    const pickBest = (pool) => [...pool].sort(compareCandidate)[0];
    const remainingCandidates = () =>
      candidates.filter((member) => !selectedMemberIds.has(member.id));

    if (autoSelectMode === CALENDAR_AUTO_SELECT_MODES.STRONGEST) {
      [...candidates]
        .sort((left, right) => {
          const supportDiff = getSupportScore(right) - getSupportScore(left);
          if (supportDiff !== 0) return supportDiff;
          return String(left?.name || "").localeCompare(String(right?.name || ""));
        })
        .slice(0, targetRosterSize)
        .forEach(tryAddMember);
    } else {
      ["Tank", "Healer", "DPS"].forEach((role) => {
        const needed = roleRequirementForMission[role] || 0;
        while (
          getSelectedRoleCount(role) < needed &&
          selectedMembers.length < targetRosterSize
        ) {
          const rolePool = remainingCandidates().filter(
            (member) => member.role === role,
          );
          if (rolePool.length === 0) break;
          tryAddMember(pickBest(rolePool));
        }
      });

      while (selectedMembers.length < targetRosterSize) {
        const pool = remainingCandidates();
        if (pool.length === 0) break;
        tryAddMember(pickBest(pool));
      }
    }

    const selectedIds = selectedMembers.map((member) => member.id);
    const preview = getAdjustedCalendarMissionPreview(
      selectedEventMission,
      selectedMembers,
    );
    const counts = getRoleCounts(selectedMembers);
    onUpdateEventRoster(selectedEvent.id, selectedIds);
    setAutoSelectSummary(
      `${CALENDAR_AUTO_SELECT_MODE_LABEL[autoSelectMode]} - ${selectedIds.length}/${maxPartySize} heroes - Success ${preview.successChance}% - Tank ${counts.Tank}/${roleRequirementForMission.Tank} - Healer ${counts.Healer}/${roleRequirementForMission.Healer} - DPS ${counts.DPS}/${roleRequirementForMission.DPS}`,
    );
  };

  const content = (
    <>
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white fantasy-font">
            Guild Calendar
          </h2>
          <p className="text-xs text-cyan-200/80 mt-1">
            Today: {formatCalendarDate(currentDayIndex)}
          </p>
        </div>
        {!isPage && (
          <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl px-2">
            &times;
          </button>
        )}
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
                  className={`aspect-square rounded border p-1 text-left text-xs overflow-hidden flex flex-col items-start justify-start ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-950/50"
                      : isToday
                        ? "border-cyan-500 bg-cyan-950/30"
                        : "border-gray-700 bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  <div className="font-bold leading-none text-gray-100">{day.dayOfMonth}</div>
                  <div className="w-full space-y-0.5 mt-2">
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
              Raid Setup
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-xs text-gray-300">
                <span className="block mb-1 text-gray-500 uppercase tracking-wide">Raid</span>
                <select
                  value={selectedMissionId}
                  onChange={(event) => selectRaidMissionOption(event.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                >
                  {raidMissionOptions.map((option) => (
                    <option key={option.key} value={option.missionId}>
                      {option.label}
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
            {selectedRaidWingMissions.length > 1 && (
              <div className="rounded border border-indigo-900/60 bg-indigo-950/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-200">
                      Run Selection
                    </h4>
                    <div className="mt-1 text-xs text-gray-400">
                      {selectedRaidIsFullRun
                        ? "Full run selected"
                        : `${selectedRaidChainMissionIds.length} wing${selectedRaidChainMissionIds.length === 1 ? "" : "s"} selected`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={selectFullRaidRun}
                    className={`rounded border px-3 py-1.5 text-xs font-bold ${
                      selectedRaidIsFullRun
                        ? "border-indigo-500 bg-indigo-800/40 text-indigo-100"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    Full Run
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedRaidWingMissions.map((mission) => {
                    const checked = selectedRaidMissionIdSet.has(String(mission.id));
                    return (
                      <label
                        key={`calendar-wing-${mission.id}`}
                        className={`flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] ${
                          checked
                            ? "border-indigo-600 bg-indigo-900/25 text-indigo-100"
                            : "border-gray-700 bg-gray-900/50 text-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectedRaidWing(mission.id)}
                          className="accent-indigo-500"
                        />
                        <span className="font-semibold">
                          {mission.dungeonWing || mission.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="rounded border border-cyan-900/60 bg-cyan-950/10 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                      One-Off Raid Event
                    </h4>
                    <div className="mt-1 text-xs text-gray-400">
                      Date:{" "}
                      <span className="text-cyan-100">
                        {formatCalendarDate(selectedDayIndex)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateEvent}
                    disabled={!selectedMissionId}
                    className="px-3 py-2 rounded border border-cyan-700 bg-cyan-950/40 text-cyan-100 font-bold text-xs disabled:opacity-40"
                  >
                    Create One-Off
                  </button>
                </div>
              </div>

              <div className="rounded border border-indigo-900/60 bg-indigo-950/10 p-3 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-200">
                  Recurring Schedule
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="text-xs text-gray-300">
                    <span className="block mb-1 text-gray-500 uppercase tracking-wide">
                      Weekly Day
                    </span>
                    <select
                      value={selectedWeekday}
                      onChange={(event) => setSelectedWeekday(Number(event.target.value))}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                    >
                      {CALENDAR_WEEKDAYS.map((weekday, index) => (
                        <option key={weekday} value={index}>
                          {weekday}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-gray-300">
                    <span className="block mb-1 text-gray-500 uppercase tracking-wide">
                      Length
                    </span>
                    <select
                      value={selectedDurationWeeks}
                      onChange={(event) =>
                        setSelectedDurationWeeks(Number(event.target.value))
                      }
                      className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-gray-100"
                    >
                      {CALENDAR_SERIES_DURATION_OPTIONS.map((weeks) => (
                        <option key={weeks} value={weeks}>
                          {weeks} weeks
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    Starts no earlier than{" "}
                    <span className="text-indigo-100">
                      {formatCalendarDate(
                        selectedDayIndex >= currentDayIndex
                          ? selectedDayIndex
                          : currentDayIndex,
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateSeries}
                    disabled={!selectedMissionId}
                    className="px-3 py-2 rounded border border-indigo-700 bg-indigo-950/40 text-indigo-100 font-bold text-xs disabled:opacity-40"
                  >
                    {missionLookup.get(String(selectedMissionId))?.raidReset?.type ===
                    "interval"
                      ? `Create Every ${
                          missionLookup.get(String(selectedMissionId))?.raidReset
                            ?.intervalDays || 3
                        }d`
                      : "Create Weekly"}
                  </button>
                </div>
              </div>
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
                      {getEventMissionIds(event).length > 1
                        ? ` - ${getEventMissionIds(event).length} wings`
                        : ""}
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
                    {getEventMissionIds(event).length > 1 && (
                      <div className="text-[11px] text-indigo-200/80">
                        {getEventMissionIds(event).length} wings
                      </div>
                    )}
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
                  {selectedEventRunLabel && (
                    <div className="mt-1 text-[11px] text-indigo-200/80">
                      {selectedEventRunLabel}
                    </div>
                  )}
                </div>
                <span className={`text-xs uppercase ${getEventStatusClass(selectedEvent.status)}`}>
                  {selectedEvent.rosterLocked ? "locked" : selectedEvent.status}
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
                {selectedEvent.autoStart === false ? " disabled" : ""}.{" "}
                {selectedEvent.rosterLocked
                  ? "Roster is locked and reserved for this raid."
                  : "Lock the roster before that time and the raid will start automatically."}
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
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-gray-500 uppercase tracking-wide">
                    Raid Comp
                  </div>
                  <div
                    aria-label="Raid success rate"
                    className={`font-bold ${approvedRosterSuccessClass}`}
                  >
                    Success Rate {approvedRosterSuccessChance}%
                  </div>
                </div>
                <div className={hasRoleCoverage ? "text-emerald-300" : "text-amber-200"}>
                  Tank {roleCounts.Tank}/{roleRequirement.Tank} - Healer{" "}
                  {roleCounts.Healer}/{roleRequirement.Healer} - DPS {roleCounts.DPS}/
                  {roleRequirement.DPS}
                </div>
              </div>

              <div className="mt-3 rounded border border-emerald-900/60 bg-emerald-950/15 p-2">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex-1 min-w-[150px] text-[11px] text-gray-300">
                    <span className="block mb-1 uppercase tracking-wide text-emerald-300">
                      Quick Selection
                    </span>
                    <select
                      value={autoSelectMode}
                      onChange={(event) => {
                        setAutoSelectMode(event.target.value);
                        setAutoSelectSummary("");
                      }}
                      disabled={!isSelectedEventEditable}
                      className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    >
                      {CALENDAR_AUTO_SELECT_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSelectRoster}
                    disabled={!isSelectedEventEditable || signupMembers.length === 0}
                    className="rounded border border-emerald-600 bg-emerald-900/45 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-800/55 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Auto-Select
                  </button>
                </div>
                {autoSelectSummary && (
                  <div className="mt-2 rounded border border-emerald-900/70 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-200">
                    {autoSelectSummary}
                  </div>
                )}
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
                          currentDayIndex: selectedEvent.scheduledDayIndex,
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
                          selectedEvent.status === CALENDAR_STATUS.CANCELLED ||
                          selectedEvent.rosterLocked
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
                  onClick={() =>
                    onLockEventRoster(selectedEvent.id, !selectedEvent.rosterLocked)
                  }
                  disabled={
                    selectedEvent.status === CALENDAR_STATUS.RUNNING ||
                    selectedEvent.status === CALENDAR_STATUS.COMPLETED ||
                    selectedEvent.status === CALENDAR_STATUS.CANCELLED ||
                    (!selectedEvent.rosterLocked && approvedMembers.length === 0)
                  }
                  className="px-3 py-2 rounded border border-indigo-700 bg-indigo-950/40 text-indigo-100 text-xs font-bold disabled:opacity-40"
                >
                  {selectedEvent.rosterLocked ? "Unlock Registration" : "Lock Raid Group"}
                </button>
                <button
                  type="button"
                  onClick={() => onStartEvent(selectedEvent.id)}
                  disabled={
                    selectedEvent.status !== CALENDAR_STATUS.READY ||
                    !selectedEvent.rosterLocked ||
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
    </>
  );

  if (isPage) {
    return (
      <section className="wow-modal-panel flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-lg border-2 border-indigo-800 bg-gray-900 shadow-2xl">
        {content}
      </section>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-indigo-800 rounded-none md:rounded-lg w-full max-w-6xl h-full md:h-[86vh] flex flex-col relative shadow-2xl"
    >
      {content}
    </BaseModal>
  );
};

export default CalendarModal;
