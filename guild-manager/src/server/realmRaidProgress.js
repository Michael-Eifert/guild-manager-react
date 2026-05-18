import { REALM_RAID_TRACKS } from "./realmDefinitions";
import { getDungeonBossCount } from "../missions/missionHelpers";

const RAID_MILESTONE_KEYS = Object.freeze({
  moltenCoreCleared: "molten_core",
  zulGurubCleared: "zul_gurub",
  ahnQirajRuinsCleared: "ahn_qiraj_ruins",
  onyxiasLairCleared: "onyxias_lair",
  blackwingLairCleared: "blackwing_lair",
  ahnQirajTempleCleared: "ahn_qiraj_temple",
  naxxramasCleared: "naxxramas",
});

const RAID_TRACK_LOOKUP = new Map(
  REALM_RAID_TRACKS.map((track) => [track.id, track]),
);

const clampNumber = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

export const getRealmRaidTrackId = (mission) => {
  const rawId =
    mission?.raidLockoutId ||
    mission?.dungeonSetId ||
    mission?.dungeonSetName ||
    mission?.name;
  return String(rawId || "")
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const createEmptyRaidProgress = () =>
  REALM_RAID_TRACKS.reduce((progress, track) => {
    progress[track.id] = {
      raidId: track.id,
      name: track.name,
      shortName: track.shortName,
      totalBosses: track.totalBosses,
      clearedBosses: 0,
      completed: false,
      lastClearDayIndex: null,
    };
    return progress;
  }, {});

export const normalizeRealmRaidProgress = (raidProgressByRaid = {}) => {
  const source =
    raidProgressByRaid && typeof raidProgressByRaid === "object"
      ? raidProgressByRaid
      : {};
  const normalized = createEmptyRaidProgress();

  REALM_RAID_TRACKS.forEach((track) => {
    const sourceProgress = source[track.id] || {};
    const clearedBosses = clampNumber(
      sourceProgress.clearedBosses,
      0,
      track.totalBosses,
    );
    normalized[track.id] = {
      ...normalized[track.id],
      clearedBosses,
      completed: Boolean(sourceProgress.completed) || clearedBosses >= track.totalBosses,
      lastClearDayIndex: Number.isFinite(Number(sourceProgress.lastClearDayIndex))
        ? Math.max(0, Math.floor(Number(sourceProgress.lastClearDayIndex)))
        : null,
    };
  });

  return normalized;
};

export const getRealmRaidProgressList = (guild) =>
  REALM_RAID_TRACKS.map((track) => {
    const progress = normalizeRealmRaidProgress(guild?.raidProgressByRaid)[track.id];
    return {
      ...progress,
      percent:
        track.totalBosses > 0
          ? Math.round((progress.clearedBosses / track.totalBosses) * 100)
          : 0,
    };
  });

export const getRealmRaidBossesCleared = (guild) =>
  getRealmRaidProgressList(guild).reduce(
    (sum, progress) => sum + progress.clearedBosses,
    0,
  );

export const getRealmRaidClearCount = (guild) =>
  getRealmRaidProgressList(guild).filter((progress) => progress.completed).length;

export const getRealmRaidStage = (guild) => {
  const raids = getRealmRaidProgressList(guild);
  const latestProgress = [...raids]
    .reverse()
    .find((progress) => progress.clearedBosses > 0);

  if (!latestProgress) return raids[0] || null;
  return latestProgress;
};

export const formatRealmRaidProgressSummary = (guild) => {
  const stage = getRealmRaidStage(guild);
  if (!stage) return "No raid progress";
  const clearLabel = stage.completed ? "cleared" : `${stage.clearedBosses}/${stage.totalBosses}`;
  return `${stage.shortName} ${clearLabel}`;
};

export const createNpcRaidProgressFromScore = ({
  raidProgress = 0,
  averageLevel = 1,
  archetype,
  random = Math.random,
} = {}) => {
  const progress = createEmptyRaidProgress();
  if (Number(averageLevel) < 55) return progress;

  const multiplier = archetype === "Hardcore Raiders" ? 1.35 : 1;
  let remainingBosses = Math.max(
    0,
    Math.floor((Number(raidProgress) || 0) * multiplier * 0.9),
  );

  REALM_RAID_TRACKS.forEach((track) => {
    if (remainingBosses <= 0) return;
    const clearCap = Math.min(track.totalBosses, remainingBosses);
    const clearedBosses =
      clearCap >= track.totalBosses
        ? track.totalBosses
        : Math.max(0, Math.floor(clearCap * (0.75 + random() * 0.25)));
    progress[track.id] = {
      ...progress[track.id],
      clearedBosses,
      completed: clearedBosses >= track.totalBosses,
    };
    remainingBosses -= clearedBosses;
  });

  return progress;
};

export const buildPlayerRaidProgress = ({
  roster = [],
  missionList = [],
  guildProgress,
  raidLockouts,
} = {}) => {
  const progress = createEmptyRaidProgress();
  const missionLookup = new Map(
    (Array.isArray(missionList) ? missionList : [])
      .filter((mission) => mission?.id != null && mission?.isRaid === true)
      .map((mission) => [String(mission.id), mission]),
  );
  const clearedMissionIds = new Set();

  (Array.isArray(roster) ? roster : []).forEach((member) => {
    (Array.isArray(member?.clearedMissionIds) ? member.clearedMissionIds : [])
      .map((missionId) => String(missionId || ""))
      .filter(Boolean)
      .forEach((missionId) => clearedMissionIds.add(missionId));
  });

  clearedMissionIds.forEach((missionId) => {
    const mission = missionLookup.get(missionId);
    const trackId = getRealmRaidTrackId(mission);
    if (!RAID_TRACK_LOOKUP.has(trackId)) return;
    const bossCount = getDungeonBossCount(mission);
    progress[trackId].clearedBosses = clampNumber(
      progress[trackId].clearedBosses + bossCount,
      0,
      progress[trackId].totalBosses,
    );
  });

  Object.entries(RAID_MILESTONE_KEYS).forEach(([milestoneKey, trackId]) => {
    if (!guildProgress?.milestones?.dungeon?.[milestoneKey]) return;
    progress[trackId].clearedBosses = progress[trackId].totalBosses;
  });

  Object.values(raidLockouts || {}).forEach((entry) => {
    const trackId = getRealmRaidTrackId({ raidLockoutId: entry?.raidKey });
    if (!RAID_TRACK_LOOKUP.has(trackId)) return;
    (Array.isArray(entry?.lockouts) ? entry.lockouts : [entry]).forEach((lockout) => {
      progress[trackId].clearedBosses = Math.max(
        progress[trackId].clearedBosses,
        clampNumber(lockout?.clearedSteps, 0, progress[trackId].totalBosses),
      );
    });
  });

  Object.keys(progress).forEach((trackId) => {
    progress[trackId].completed =
      progress[trackId].clearedBosses >= progress[trackId].totalBosses;
  });

  return progress;
};

export const advanceNpcRaidProgressForDay = ({
  guild,
  dayIndex,
  random = Math.random,
  raidGrowth = 0,
} = {}) => {
  const progress = normalizeRealmRaidProgress(guild?.raidProgressByRaid);
  const events = [];
  if (Number(guild?.averageLevel) < 50 || raidGrowth <= 0) {
    return { raidProgressByRaid: progress, events };
  }

  const roll = random();
  const bossKills =
    roll < Math.min(0.72, raidGrowth / 4)
      ? Math.max(1, Math.floor(raidGrowth * (0.35 + random() * 0.45)))
      : 0;
  let remainingKills = bossKills;

  REALM_RAID_TRACKS.forEach((track) => {
    if (remainingKills <= 0) return;
    const current = progress[track.id];
    if (current.completed) return;

    const before = current.clearedBosses;
    const nextCleared = clampNumber(
      before + remainingKills,
      0,
      track.totalBosses,
    );
    remainingKills -= nextCleared - before;

    progress[track.id] = {
      ...current,
      clearedBosses: nextCleared,
      completed: nextCleared >= track.totalBosses,
      lastClearDayIndex:
        nextCleared >= track.totalBosses ? dayIndex : current.lastClearDayIndex,
    };

    if (nextCleared >= track.totalBosses && before < track.totalBosses) {
      events.push({
        type: "raid-clear",
        guildId: guild.id,
        guildName: guild.name,
        raidId: track.id,
        raidName: track.name,
        shortName: track.shortName,
        clearedBosses: nextCleared,
        totalBosses: track.totalBosses,
      });
    } else if (nextCleared > before && random() < 0.35) {
      events.push({
        type: "raid-progress",
        guildId: guild.id,
        guildName: guild.name,
        raidId: track.id,
        raidName: track.name,
        shortName: track.shortName,
        clearedBosses: nextCleared,
        totalBosses: track.totalBosses,
      });
    }
  });

  return { raidProgressByRaid: progress, events };
};
