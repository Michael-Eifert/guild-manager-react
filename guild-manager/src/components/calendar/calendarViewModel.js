import { CALENDAR_STATUS, getCalendarDate } from "../../calendar/calendarLogic";

export const CALENDAR_AUTO_SELECT_MODES = Object.freeze({
  MAX_SUCCESS: "maxSuccess",
  ROLE_COVERAGE: "roleCoverage",
  STRONGEST: "strongest",
});
export const CALENDAR_AUTO_SELECT_MODE_OPTIONS = Object.freeze([
  { value: CALENDAR_AUTO_SELECT_MODES.MAX_SUCCESS, label: "Max Success" },
  { value: CALENDAR_AUTO_SELECT_MODES.ROLE_COVERAGE, label: "Role Coverage" },
  { value: CALENDAR_AUTO_SELECT_MODES.STRONGEST, label: "Strongest" },
]);
export const CALENDAR_AUTO_SELECT_MODE_LABEL = Object.fromEntries(
  CALENDAR_AUTO_SELECT_MODE_OPTIONS.map((option) => [option.value, option.label]),
);

export const getMissionRoleRequirement = (mission) => ({
  Tank: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.Tank) || 0)),
  Healer: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.Healer) || 0)),
  DPS: Math.max(0, Math.floor(Number(mission?.raidRoleRequirement?.DPS) || 0)),
});
export const getRoleCounts = (members) =>
  (Array.isArray(members) ? members : []).reduce(
    (counts, member) => ({ ...counts, [member.role]: (counts[member.role] || 0) + 1 }),
    { Tank: 0, Healer: 0, DPS: 0 },
  );
export const getEventStatusClass = (status) => {
  if (status === CALENDAR_STATUS.READY) return "border-emerald-600 text-emerald-200";
  if (status === CALENDAR_STATUS.RUNNING) return "border-blue-600 text-blue-200";
  if (status === CALENDAR_STATUS.COMPLETED) return "border-gray-600 text-gray-400";
  if (status === CALENDAR_STATUS.CANCELLED) return "border-red-700 text-red-300";
  return "border-yellow-700 text-yellow-200";
};
export const isTerminalEventStatus = (status) =>
  status === CALENDAR_STATUS.COMPLETED || status === CALENDAR_STATUS.CANCELLED;
export const getRaidResetShortLabel = (mission) => {
  const labels = {
    "Molten Core": "MC Reset", "Zul'Gurub": "ZG Reset", "Onyxia's Lair": "Ony Reset",
    "Blackwing Lair": "BWL Reset", "Ruins of Ahn'Qiraj": "AQ20 Reset", "Temple of Ahn'Qiraj": "AQ40 Reset",
  };
  return labels[mission?.name] || `${mission?.name || "Raid"} Reset`;
};
export const sortRaidWingsByProgression = (left, right) => {
  const order = (Number(left?.wingOrder) || 0) - (Number(right?.wingOrder) || 0);
  if (order !== 0) return order;
  const level = (left?.level || 0) - (right?.level || 0);
  return level !== 0 ? level : String(left?.dungeonWing || left?.name || "").localeCompare(String(right?.dungeonWing || right?.name || ""));
};
export const getRaidMissionOptions = (raidMissions) => {
  const options = [];
  const groupedSets = new Map();
  (Array.isArray(raidMissions) ? raidMissions : []).forEach((mission) => {
    if (mission?.dungeonSetId && mission?.dungeonSetName) {
      const key = `set:${mission.dungeonSetId}`;
      if (!groupedSets.has(key)) {
        const option = { key, label: mission.dungeonSetName, missions: [] };
        groupedSets.set(key, option);
        options.push(option);
      }
      groupedSets.get(key).missions.push(mission);
    } else {
      options.push({ key: `mission:${mission.id}`, label: mission?.name || "Raid", missions: [mission] });
    }
  });
  return options.map((option) => {
    const missions = [...option.missions].sort(sortRaidWingsByProgression);
    return { ...option, missionId: missions[0]?.id ?? "", missions };
  }).sort((left, right) => {
    const level = (left.missions[0]?.level || 0) - (right.missions[0]?.level || 0);
    return level !== 0 ? level : String(left.label).localeCompare(String(right.label));
  });
};
export const getEventMissionIds = (event) =>
  Array.isArray(event?.missionIds) && event.missionIds.length > 0
    ? event.missionIds
    : event?.missionId ? [event.missionId] : [];
export const isRaidResetDay = (mission, dayIndex) => {
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
