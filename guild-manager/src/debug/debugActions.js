import { CONFIG, GUILD_FACTION, INITIAL_MISSIONS } from "../constants";
import { getSkillCap } from "../game/characterActivity";
import { GUILD_POINT_LABEL, normalizeGuildProgress } from "../guildProgression";
import { cloneMissionTemplate } from "../missions/missionTemplates";
import { getReqExp } from "../utils";
import {
  getMissionListWithZones,
  normalizeRosterZones as normalizeRosterZonesForFaction,
} from "../zones/zoneLogic";

export const applyDebugLevelAndProfessionDelta = (char, levelDelta) => {
  const newLevel = Math.min(
    CONFIG.LEVEL_CAP,
    Math.max(1, (Number(char?.level) || 1) + levelDelta),
  );
  const appliedLevelDelta = newLevel - (Number(char?.level) || 1);
  const profDelta = appliedLevelDelta * 5;
  const newSkillCap = Math.min(300, getSkillCap(newLevel));

  const updatedProfessions = (Array.isArray(char?.professions)
    ? char.professions
    : []
  ).map((prof) => {
    const shifted = (Number(prof?.skill) || 0) + profDelta;
    return {
      ...prof,
      skill: Math.max(0, Math.min(newSkillCap, shifted)),
    };
  });

  return {
    ...char,
    level: newLevel,
    exp: 0,
    maxExp: getReqExp(newLevel),
    professions: updatedProfessions,
  };
};

export const createDebugActions = ({
  itemDatabase = [],
  maxRoster = 0,
  goldCap = 0,
  refs,
  setters,
  closeDebug,
  pushNotification,
  appendGuildRenownLog,
} = {}) => {
  const getFaction = () =>
    refs?.guildSetup?.current?.faction || GUILD_FACTION.ALLIANCE;
  const getItemDatabase = () =>
    Array.isArray(itemDatabase) ? itemDatabase : [];

  const notify = (notification) => {
    if (typeof pushNotification === "function") pushNotification(notification);
  };

  const close = () => {
    if (typeof closeDebug === "function") closeDebug();
  };

  const prepareRaidTestGuild = async (presetValue) => {
    const { buildDebugRosterPreset, resolveDebugPreset } = await import(
      "./rosterPresets"
    );
    const preset = resolveDebugPreset(presetValue);
    const faction = getFaction();
    const debugRaidRoster = buildDebugRosterPreset({
      faction,
      level: preset.level,
      count: preset.count,
      roleOrder: preset.roleOrder,
      guaranteedKeys: preset.guaranteedKeys,
      gearProfile: preset.gearProfile,
      itemDatabase: getItemDatabase(),
      usedNames: [],
    });
    const normalizedRoster = normalizeRosterZonesForFaction(
      debugRaidRoster,
      faction,
    );
    const unlockedProgress = normalizeGuildProgress(
      refs?.guildProgress?.current,
    );
    const nextGuildProgress = {
      ...unlockedProgress,
      totalRenown: Math.max(unlockedProgress.totalRenown, 12),
      talents: {
        ...unlockedProgress.talents,
        rosterCap: 3,
        raidAttunement: 1,
      },
    };

    refs.roster.current = normalizedRoster;
    setters?.setRoster?.(normalizedRoster);
    refs.guildRelationships.current = {};
    setters?.setGuildRelationships?.({});
    refs.guildProgress.current = nextGuildProgress;
    setters?.setGuildProgress?.(nextGuildProgress);
    refs.missions.current = [];
    refs.raidLockouts.current = {};
    refs.rewardedMissionIds.current = new Set();
    setters?.setActiveMissions?.([]);
    setters?.setRaidLockouts?.({});
    setters?.setGuildLog?.((prev) =>
      [
        {
          time: new Date().toLocaleTimeString(),
          type: "guild-renown",
          message: preset.logMessage || `Debug setup: ${preset.successTitle}.`,
        },
        ...prev,
      ],
    );
    notify({
      type: "info",
      title: preset.successTitle,
      message: preset.successMessage(faction),
    });
    close();
  };

  return {
    changeLevel(id, amount) {
      setters?.setRoster?.((prev) =>
        prev.map((character) =>
          character.id !== id
            ? character
            : applyDebugLevelAndProfessionDelta(character, amount),
        ),
      );
    },

    bulkLevel(amount) {
      setters?.setRoster?.((prev) =>
        prev.map((character) =>
          applyDebugLevelAndProfessionDelta(character, amount),
        ),
      );
      close();
    },

    addGold(amount) {
      const safeAmount = Math.max(0, Number(amount) || 0);
      if (safeAmount <= 0) return;

      const cappedGold = Math.min(
        Math.max(0, Number(goldCap) || 0),
        (Number(refs?.gold?.current) || 0) + safeAmount,
      );
      refs.gold.current = cappedGold;
      setters?.setGuildGold?.(cappedGold);
    },

    addRenown(amount) {
      const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
      if (safeAmount <= 0) return;

      setters?.setGuildProgress?.((prev) => {
        const normalized = normalizeGuildProgress(prev);
        return {
          ...normalized,
          renownPoints: normalized.renownPoints + safeAmount,
          totalRenown: normalized.totalRenown + safeAmount,
        };
      });
      appendGuildRenownLog?.(
        `Debug grant: +${safeAmount} ${GUILD_POINT_LABEL}.`,
      );
      notify({
        type: "info",
        title: "Guild Renown Added",
        message: `+${safeAmount} ${GUILD_POINT_LABEL}`,
      });
    },

    async addPresetParty(presetValue) {
      const { buildDebugRosterPreset, resolveDebugPreset } = await import(
        "./rosterPresets"
      );
      const preset = resolveDebugPreset(presetValue);
      const currentRoster = Array.isArray(refs?.roster?.current)
        ? refs.roster.current
        : [];
      const openSlots = Math.max(0, maxRoster - currentRoster.length);
      if (openSlots < preset.count) {
        notify({
          type: "error",
          title: "Debug Party Blocked",
          message: preset.blockedMessage,
        });
        return;
      }

      const faction = getFaction();
      const debugParty = buildDebugRosterPreset({
        faction,
        level: preset.level,
        count: preset.count,
        roleOrder: preset.roleOrder,
        guaranteedKeys: preset.guaranteedKeys,
        gearProfile: preset.gearProfile,
        itemDatabase: getItemDatabase(),
        usedNames: currentRoster.map((member) => member?.name).filter(Boolean),
      });
      const updatedRoster = normalizeRosterZonesForFaction(
        [...currentRoster, ...debugParty],
        faction,
      );
      refs.roster.current = updatedRoster;
      setters?.setRoster?.(updatedRoster);
      notify({
        type: "info",
        title: preset.successTitle,
        message: preset.successMessage(faction),
      });
      close();
    },

    prepareMoltenCoreTestGuild() {
      return prepareRaidTestGuild("molten-core-test-guild");
    },

    prepareBlackwingLairTestGuild() {
      return prepareRaidTestGuild("blackwing-lair-test-guild");
    },

    prepareNaxxramasTestGuild() {
      return prepareRaidTestGuild("naxxramas-test-guild");
    },

    reloadDatabase() {
      setters?.setMissionList?.(
        getMissionListWithZones(INITIAL_MISSIONS.map(cloneMissionTemplate)),
      );
      notify({
        type: "info",
        title: "Database Reloaded",
        message: "Mission templates were reloaded from constants.",
      });
      close();
    },
  };
};
