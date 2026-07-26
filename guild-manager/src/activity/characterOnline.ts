import type { Character } from "../types/characterTypes";

export type OnlineProfileId = "quarter" | "half" | "three_quarters";
export type OnlineExtensionReason =
  | "mission"
  | "battlefield"
  | "lfg"
  | "calendar";

export type CharacterOnlineStatus = {
  characterId: string;
  profile: OnlineProfileId;
  profileLabel: string;
  durationHours: 6 | 12 | 18;
  startHour: number;
  endHour: number;
  scheduledOnline: boolean;
  effectiveOnline: boolean;
  status: "Online" | "Offline" | "On Mission";
  extensionReason: OnlineExtensionReason | null;
  nextLoginDayIndex: number;
  nextLoginHour: number;
  nextLogoutDayIndex: number;
  nextLogoutHour: number;
};

export type OnlineSnapshot = {
  byId: Record<string, CharacterOnlineStatus>;
  onlineIds: Set<string>;
  onMissionIds: Set<string>;
  onlineCount: number;
  onMissionCount: number;
  nextLogin: CharacterOnlineStatus | null;
};

const PROFILE_HOURS: Record<OnlineProfileId, 6 | 12 | 18> = {
  quarter: 6,
  half: 12,
  three_quarters: 18,
};

const PROFILE_LABELS: Record<OnlineProfileId, string> = {
  quarter: "Casual (1/4)",
  half: "Regular (2/4)",
  three_quarters: "Hardcore (3/4)",
};

const stableHash = (value: unknown) => {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const normalizeTraitIds = (character: Character) => {
  const values = [
    character.personalityTrait,
    ...(Array.isArray(character.personalityTraits)
      ? character.personalityTraits
      : []),
  ];
  return values.map((value) =>
    String(
      typeof value === "object" && value
        ? (value as { id?: string }).id
        : value || "",
    )
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );
};

export const getCharacterOnlineProfile = (
  character: Character & { activityLevel?: number },
): OnlineProfileId => {
  const traits = normalizeTraitIds(character);
  if (traits.includes("casual_gamer")) return "quarter";
  if (traits.some((trait) => trait === "raider" || trait === "power_leveler")) {
    return "three_quarters";
  }
  if (traits.includes("dungeon_expert")) return "half";

  const activityLevel = Number(character.activityLevel);
  if (Number.isFinite(activityLevel)) {
    if (activityLevel <= 40) return "quarter";
    if (activityLevel >= 75) return "three_quarters";
  }
  return "half";
};

export const getCharacterOnlineSchedule = ({
  character,
  dayIndex,
}: {
  character: Character & { activityLevel?: number };
  dayIndex: number;
}) => {
  const characterId = String(character.id || "");
  const profile = getCharacterOnlineProfile(character);
  const durationHours = PROFILE_HOURS[profile];
  const baseStartHour = stableHash(`${characterId}:online-start`) % 24;
  const jitter = (stableHash(`${characterId}:day:${Math.floor(dayIndex)}`) % 3) - 1;
  const startHour = (baseStartHour + jitter + 24) % 24;
  return {
    profile,
    profileLabel: PROFILE_LABELS[profile],
    durationHours,
    startHour,
    endHour: (startHour + durationHours) % 24,
  };
};

export const getCharacterOnlineStatus = ({
  character,
  dayIndex,
  dayProgress,
  extensionReason = null,
  onMission = false,
}: {
  character: Character & { activityLevel?: number };
  dayIndex: number;
  dayProgress: number;
  extensionReason?: OnlineExtensionReason | null;
  onMission?: boolean;
}): CharacterOnlineStatus => {
  const schedule = getCharacterOnlineSchedule({ character, dayIndex });
  const previousSchedule = getCharacterOnlineSchedule({
    character,
    dayIndex: Math.max(0, Math.floor(dayIndex) - 1),
  });
  const currentHour = Math.min(23.999999, Math.max(0, dayProgress * 24));
  const inCurrentWindow =
    currentHour >= schedule.startHour &&
    currentHour < schedule.startHour + schedule.durationHours;
  const previousOverflow = Math.max(
    0,
    previousSchedule.startHour + previousSchedule.durationHours - 24,
  );
  const inPreviousWindow = currentHour < previousOverflow;
  const scheduledOnline = inCurrentWindow || inPreviousWindow;
  const effectiveOnline = scheduledOnline || Boolean(extensionReason);
  const nextDaySchedule = getCharacterOnlineSchedule({
    character,
    dayIndex: Math.floor(dayIndex) + 1,
  });
  const nextLogin =
    !scheduledOnline && currentHour < schedule.startHour
      ? { dayIndex: Math.floor(dayIndex), hour: schedule.startHour }
      : {
          dayIndex: Math.floor(dayIndex) + 1,
          hour: nextDaySchedule.startHour,
        };
  const logout =
    inPreviousWindow
      ? { dayIndex: Math.floor(dayIndex), hour: previousOverflow }
      : {
          dayIndex:
            Math.floor(dayIndex) +
            (schedule.startHour + schedule.durationHours >= 24 ? 1 : 0),
          hour: schedule.endHour,
        };

  return {
    characterId: String(character.id || ""),
    ...schedule,
    scheduledOnline,
    effectiveOnline,
    status: onMission ? "On Mission" : effectiveOnline ? "Online" : "Offline",
    extensionReason,
    nextLoginDayIndex: nextLogin.dayIndex,
    nextLoginHour: nextLogin.hour,
    nextLogoutDayIndex: logout.dayIndex,
    nextLogoutHour: logout.hour,
  };
};

const collectActivityLocks = ({
  activeMissions = [],
  activeBattles = [],
  searches = [],
  calendarEvents = [],
  dayIndex,
  dayProgress,
}: {
  activeMissions?: Array<Record<string, any>>;
  activeBattles?: Array<Record<string, any>>;
  searches?: Array<Record<string, any>>;
  calendarEvents?: Array<Record<string, any>>;
  dayIndex: number;
  dayProgress: number;
}) => {
  const reasons = new Map<string, OnlineExtensionReason>();
  const onMissionIds = new Set<string>();
  activeMissions.forEach((mission) =>
    (mission.memberIds || []).forEach((id: unknown) => {
      reasons.set(String(id), "mission");
      onMissionIds.add(String(id));
    }),
  );
  activeBattles.forEach((battle) =>
    (battle.participantIds || []).forEach((id: unknown) => {
      reasons.set(String(id), "battlefield");
      onMissionIds.add(String(id));
    }),
  );
  searches
    .filter((search) =>
      ["guild", "general", "ready", "forming"].includes(String(search.phase)),
    )
    .forEach((search) =>
      (search.participants || [])
        .forEach((participant: Record<string, unknown>) =>
          reasons.set(String(participant.id), "lfg"),
        ),
    );
  calendarEvents
    .filter((event) => {
      const eventDay = Number(event.scheduledDayIndex);
      const startProgress = Number(event.scheduledDayProgress ?? event.dayProgress);
      const timeOfDayProgress: Record<string, number> = {
        morning: 0.25,
        midday: 0.5,
        evening: 0.75,
      };
      const normalizedStart = Number.isFinite(startProgress)
        ? startProgress
        : timeOfDayProgress[String(event.scheduledTimeOfDay || "").toLowerCase()] ??
          0.5;
      return (
        eventDay === Math.floor(dayIndex) &&
        event.rosterLocked === true &&
        ["scheduled", "ready", "running"].includes(
          String(event.status).toLowerCase(),
        ) &&
        dayProgress >= Math.max(0, normalizedStart - 1 / 24)
      );
    })
    .forEach((event) =>
      (event.approvedRosterIds || []).forEach((id: unknown) => {
        if (!reasons.has(String(id))) reasons.set(String(id), "calendar");
      }),
    );
  return { reasons, onMissionIds };
};

export const buildOnlineSnapshot = ({
  characters,
  dayIndex,
  dayProgress,
  activeMissions,
  activeBattles,
  searches,
  calendarEvents,
  offlineSimulationEnabled = true,
}: {
  characters: Array<Character & { activityLevel?: number }>;
  dayIndex: number;
  dayProgress: number;
  activeMissions?: Array<Record<string, any>>;
  activeBattles?: Array<Record<string, any>>;
  searches?: Array<Record<string, any>>;
  calendarEvents?: Array<Record<string, any>>;
  offlineSimulationEnabled?: boolean;
}): OnlineSnapshot => {
  const { reasons, onMissionIds } = collectActivityLocks({
    activeMissions,
    activeBattles,
    searches,
    calendarEvents,
    dayIndex,
    dayProgress,
  });
  const byId: Record<string, CharacterOnlineStatus> = {};
  const onlineIds = new Set<string>();
  let nextLogin: CharacterOnlineStatus | null = null;
  characters.forEach((character) => {
    const id = String(character.id || "");
    const scheduledStatus = getCharacterOnlineStatus({
      character,
      dayIndex,
      dayProgress,
      extensionReason: reasons.get(id) || null,
      onMission: onMissionIds.has(id),
    });
    const status = offlineSimulationEnabled
      ? scheduledStatus
      : {
          ...scheduledStatus,
          effectiveOnline: true,
          status: onMissionIds.has(id) ? "On Mission" as const : "Online" as const,
        };
    byId[id] = status;
    if (status.effectiveOnline) onlineIds.add(id);
    if (
      !status.effectiveOnline &&
      (!nextLogin ||
        status.nextLoginDayIndex < nextLogin.nextLoginDayIndex ||
        (status.nextLoginDayIndex === nextLogin.nextLoginDayIndex &&
          status.nextLoginHour < nextLogin.nextLoginHour))
    ) {
      nextLogin = status;
    }
  });
  return {
    byId,
    onlineIds,
    onMissionIds,
    onlineCount: onlineIds.size,
    onMissionCount: onMissionIds.size,
    nextLogin,
  };
};

export const shouldUseAutoFastForward = ({
  isPaused,
  memberCount,
  onlineCount,
  hasActiveMission,
  hasActiveBattlefield,
  hasActiveLfg,
  hasElection,
}: {
  isPaused: boolean;
  memberCount: number;
  onlineCount: number;
  hasActiveMission: boolean;
  hasActiveBattlefield: boolean;
  hasActiveLfg: boolean;
  hasElection: boolean;
}) =>
  !isPaused &&
  memberCount > 0 &&
  onlineCount === 0 &&
  !hasActiveMission &&
  !hasActiveBattlefield &&
  !hasActiveLfg &&
  !hasElection;
