import {
  MORALE_DUNGEON_CLEAR_DELTA,
  MORALE_ELITE_FAILURE_DELTA,
  MORALE_ELITE_SUCCESS_DELTA,
  applyMoraleDelta,
  isCharacterInMissionLevelRange,
} from "../game/characterMorale";
import { clearCompletedAdventureGoals } from "../automation/adventureGoals";

const DUNGEON_BONUS_UNCOMMON_DROP_CHANCE = 0.1;
const DEFAULT_DUNGEON_BONUS_DROPS = Object.freeze([
  {
    chance: DUNGEON_BONUS_UNCOMMON_DROP_CHANCE,
    qualityPriority: [2],
    options: {
      includeWorldDrops: true,
      dungeonOnly: false,
      worldOnly: false,
    },
  },
]);

export const createMissionRewardProcessor = ({
  dbItems,
  dbClasses,
  getClassArmorTypes,
  isItemUsableByClass,
  getKeyLabel,
  getItemEffectiveLevel,
  getMissionLootLevelRange,
  resolveMissionRewardQualities,
  getDungeonStepLootConfig,
  getDungeonStepQualityPriority,
  getDungeonBossCount,
  getDungeonQuarterExpMultiplier,
  getDungeonOverlevelExpMultiplier,
  getMissionLevelExpMultiplier,
  getReqExp,
  getMissionGoldReward,
}) => {
  const normalizeDungeonKey = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return raw
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const toNormalizedDungeonKeys = (values) => [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeDungeonKey(value))
        .filter(Boolean),
    ),
  ];

  const normalizeBossKey = (value) => normalizeDungeonKey(value);

  const getItemSourceBossKeys = (item) =>
    toNormalizedDungeonKeys(item?.sourceBosses);

  const preferSourceBossCandidates = (items, sourceBossName) => {
    const sourceBossKey = normalizeBossKey(sourceBossName);
    if (!sourceBossKey || items.length === 0) return items;
    const bossSpecificItems = items.filter((item) =>
      getItemSourceBossKeys(item).includes(sourceBossKey),
    );
    return bossSpecificItems.length > 0 ? bossSpecificItems : items;
  };

  const getItemDungeonKeys = (item) => {
    return toNormalizedDungeonKeys([
      item?.dungeon,
      item?.dungeonSetId,
      item?.dungeonSetName,
    ]);
  };

  const getMissionDungeonKeys = (mission) => {
    return toNormalizedDungeonKeys([
      mission?.name,
      mission?.dungeonSetId,
      mission?.dungeonSetName,
    ]);
  };

  const isMatchingDungeonWing = (item, mission) => {
    const itemWingKey = normalizeDungeonKey(item?.dungeonWing);
    if (!itemWingKey) return true;
    return itemWingKey === normalizeDungeonKey(mission?.dungeonWing);
  };

  const getMissionLootCandidatesForCharacter = (mission, char, quality) => {
    const classInfo = dbClasses?.[char?.charClass];
    if (!classInfo) return [];

    const allowedTypes = getClassArmorTypes(char.charClass, char.level);
    const { minLevel, maxLevel } = getMissionLootLevelRange(mission);

    return dbItems.filter((item) => {
      if (item.quality !== quality) return false;
      if (item.minLevel < minLevel || item.minLevel > maxLevel) return false;

      if (!isItemUsableByClass(item, char?.charClass)) return false;

      const typeOK = item.type === "Generic" || allowedTypes.includes(item.type);
      if (!typeOK) return false;

      const itemDungeonKeys = getItemDungeonKeys(item);
      if (mission.type === "dungeon") {
        if (itemDungeonKeys.length > 0) {
          const missionKeys = new Set(getMissionDungeonKeys(mission));
          const isMatchingDungeonLoot = itemDungeonKeys.some((key) =>
            missionKeys.has(key),
          );
          if (!isMatchingDungeonLoot) return false;
          if (!isMatchingDungeonWing(item, mission)) return false;
        }
        return true;
      }

      return itemDungeonKeys.length === 0;
    });
  };

  const getMissionLootCandidatesForQuality = (mission, quality, options = {}) => {
    const includeWorldDrops = options.includeWorldDrops === true;
    const dungeonOnly = options.dungeonOnly === true;
    const worldOnly = options.worldOnly === true;
    const { minLevel, maxLevel } = getMissionLootLevelRange(mission);

    const candidates = dbItems.filter((item) => {
      if (item.quality !== quality) return false;
      if (item.minLevel < minLevel || item.minLevel > maxLevel) return false;

      const itemDungeonKeys = getItemDungeonKeys(item);
      if (mission.type === "dungeon") {
        const missionKeys = new Set(getMissionDungeonKeys(mission));
        const isMatchingDungeonLoot = itemDungeonKeys.some((key) =>
          missionKeys.has(key),
        );
        if (worldOnly) return itemDungeonKeys.length === 0;
        if (itemDungeonKeys.length > 0) {
          return isMatchingDungeonLoot && isMatchingDungeonWing(item, mission);
        }
        if (dungeonOnly) return false;
        return includeWorldDrops;
      }

      return itemDungeonKeys.length === 0;
    });

    return candidates;
  };

  const canCharacterUseItem = (char, item) => {
    if (!char || !item) return false;
    if (!isItemUsableByClass(item, char.charClass)) return false;
    const allowedTypes = getClassArmorTypes(char.charClass, char.level);
    return item.type === "Generic" || allowedTypes.includes(item.type);
  };

  const getItemUpgradeGainForCharacter = (char, item) => {
    const currentItemLevel = getItemEffectiveLevel(char?.equipment?.[item.slot]);
    return getItemEffectiveLevel(item) - currentItemLevel;
  };

  const pickMissionLootForCharacter = (mission, char, quality, preferUpgrade = true) => {
    let candidates = getMissionLootCandidatesForCharacter(mission, char, quality);
    if (candidates.length === 0) return null;

    if (preferUpgrade) {
      const upgrades = candidates.filter(
        (item) =>
          getItemEffectiveLevel(item) >
          getItemEffectiveLevel(char.equipment?.[item.slot]),
      );
      if (upgrades.length > 0) candidates = upgrades;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const pickDungeonDropForParty = (mission, partyMembers, qualityPriority, options = {}) => {
    if (partyMembers.length === 0) return { discarded: true };

    const qualityOrder =
      Array.isArray(qualityPriority) && qualityPriority.length > 0
        ? qualityPriority
        : [2, 3];

    for (const preferredQuality of qualityOrder) {
      const qualityPool = getMissionLootCandidatesForQuality(
        mission,
        preferredQuality,
        options,
      );
      if (qualityPool.length === 0) continue;

      const preferredQualityPool = preferSourceBossCandidates(
        qualityPool,
        options.sourceBossName,
      );
      const findUsableItems = (items) =>
        items.filter((item) =>
          partyMembers.some((member) => canCharacterUseItem(member, item)),
        );

      let usableItems = findUsableItems(preferredQualityPool);
      if (usableItems.length === 0 && preferredQualityPool !== qualityPool) {
        usableItems = findUsableItems(qualityPool);
      }

      if (usableItems.length === 0) continue;

      const upgradeItems = usableItems.filter((item) =>
        partyMembers.some(
          (member) =>
            canCharacterUseItem(member, item) &&
            getItemUpgradeGainForCharacter(member, item) > 0,
        ),
      );
      const itemPool = upgradeItems.length > 0 ? upgradeItems : usableItems;
      const rolledItem = itemPool[Math.floor(Math.random() * itemPool.length)];

      const eligibleMembers = partyMembers.filter((member) =>
        canCharacterUseItem(member, rolledItem),
      );
      if (eligibleMembers.length === 0) continue;
      if (eligibleMembers.length === 1) {
        return {
          winnerId: eligibleMembers[0].id,
          item: rolledItem,
          discarded: false,
        };
      }

      const upgradeEligible = eligibleMembers.filter(
        (member) => getItemUpgradeGainForCharacter(member, rolledItem) > 0,
      );
      const recipientPool = upgradeEligible.length > 0 ? upgradeEligible : eligibleMembers;
      const bestGain = Math.max(
        ...recipientPool.map((member) =>
          getItemUpgradeGainForCharacter(member, rolledItem),
        ),
      );
      const bestRecipients = recipientPool.filter(
        (member) => getItemUpgradeGainForCharacter(member, rolledItem) === bestGain,
      );
      const winner = bestRecipients[Math.floor(Math.random() * bestRecipients.length)];
      if (winner) {
        return { winnerId: winner.id, item: rolledItem, discarded: false };
      }
    }

    return { discarded: true };
  };

  const getMissionBossName = (mission, stepIndex) => {
    const bossNames = Array.isArray(mission?.dungeonBosses)
      ? mission.dungeonBosses
          .map((bossName) => String(bossName || "").trim())
          .filter(Boolean)
      : [];
    if (bossNames[stepIndex]) return bossNames[stepIndex];

    const totalBosses = Math.max(1, Number(getDungeonBossCount(mission)) || 1);
    return stepIndex === totalBosses - 1 ? "Endboss" : `Boss ${stepIndex + 1}`;
  };

  const buildMissionLootMap = (mission, partyMembers) => {
    const lootMap = new Map(partyMembers.map((member) => [member.id, []]));
    if (partyMembers.length === 0) return { lootMap, discardedDrops: 0 };

    const rewardQualities = resolveMissionRewardQualities(mission);
    partyMembers.forEach((member) => {
      const quality =
        rewardQualities[Math.floor(Math.random() * rewardQualities.length)] || 1;
      const item = pickMissionLootForCharacter(mission, member, quality, true);
      if (!item) return;
      lootMap.get(member.id)?.push({
        item,
        sourceBossName: null,
        sourceBossStep: null,
      });
    });

    return { lootMap, discardedDrops: 0 };
  };

  const getAwardedDungeonLootSteps = (mission) =>
    new Set(
      (Array.isArray(mission?.dungeonProgress?.lootAwardedSteps)
        ? mission.dungeonProgress.lootAwardedSteps
        : [])
        .map((step) => Math.floor(Number(step) || 0))
        .filter((step) => step > 0),
    );

  const buildDungeonBossLootMap = (mission, partyMembers, lootOptions = {}) => {
    const lootMap = new Map(partyMembers.map((member) => [member.id, []]));
    const dungeonBossCount = getDungeonBossCount(mission);
    const options =
      lootOptions && typeof lootOptions === "object"
        ? lootOptions
        : { clearedSteps: lootOptions };
    const clearedSteps = Number(options.clearedSteps);
    const safeClearedSteps = Math.max(0, Math.min(dungeonBossCount, clearedSteps));
    const explicitStepIndexes = Array.isArray(options.stepIndexes)
      ? new Set(
          options.stepIndexes
            .map((stepIndex) => Math.floor(Number(stepIndex)))
            .filter((stepIndex) => stepIndex >= 0 && stepIndex < dungeonBossCount),
        )
      : null;
    const awardedSteps = getAwardedDungeonLootSteps(mission);
    const skipAwardedSteps = options.skipAwardedSteps === true;
    const includeOnCompleteBonus = options.includeOnCompleteBonus !== false;
    let discardedDrops = 0;

    const applyDropResult = (dropResult, sourceContext = null) => {
      if (!dropResult || dropResult.discarded || !dropResult.item) {
        discardedDrops += 1;
        return;
      }
      lootMap.get(dropResult.winnerId)?.push({
        item: dropResult.item,
        sourceBossName:
          sourceContext && typeof sourceContext.bossName === "string"
            ? sourceContext.bossName
            : null,
        sourceBossStep: Number.isFinite(sourceContext?.bossStep)
          ? Number(sourceContext.bossStep)
          : null,
      });
    };

    const getConfiguredBonusDrops = () => {
      const configuredBonusDrops = Array.isArray(mission?.bonusDrops)
        ? mission.bonusDrops
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null;
              const rawChance = Number(entry.chance);
              if (!Number.isFinite(rawChance) || rawChance <= 0) return null;
              const chance =
                rawChance > 1 && rawChance <= 100 ? rawChance / 100 : rawChance;
              if (!Number.isFinite(chance) || chance <= 0) return null;

              const qualityPriority = Array.isArray(entry.qualityPriority)
                ? entry.qualityPriority
                    .map((quality) => Number(quality))
                    .filter((quality) => Number.isFinite(quality) && quality > 0)
                : [];

              return {
                chance: Math.min(1, chance),
                qualityPriority:
                  qualityPriority.length > 0 ? qualityPriority : undefined,
                onComplete: entry.onComplete === true,
                options: {
                  includeWorldDrops: entry.includeWorldDrops === true,
                  dungeonOnly: entry.dungeonOnly === true,
                  worldOnly: entry.worldOnly === true,
                },
              };
            })
            .filter(Boolean)
        : [];

      return [...DEFAULT_DUNGEON_BONUS_DROPS, ...configuredBonusDrops];
    };

    const bonusDrops = getConfiguredBonusDrops();
    const isFullDungeonClear =
      dungeonBossCount > 0 && safeClearedSteps >= dungeonBossCount;

    const getStepDropCount = (stepIndex) => {
      const isEndbossStep = stepIndex === dungeonBossCount - 1;
      const minRaw = isEndbossStep
        ? mission?.endbossDropCountMin ?? mission?.bossDropCountMin ?? 1
        : mission?.bossDropCountMin ?? 1;
      const maxRaw = isEndbossStep
        ? mission?.endbossDropCountMax ??
          mission?.bossDropCountMax ??
          mission?.bossDropCountMin ??
          1
        : mission?.bossDropCountMax ?? mission?.bossDropCountMin ?? 1;
      const min = Math.max(1, Math.floor(Number(minRaw) || 1));
      const max = Math.max(min, Math.floor(Number(maxRaw) || min));
      if (max <= min) return min;
      return min + Math.floor(Math.random() * (max - min + 1));
    };

    for (let stepIndex = 0; stepIndex < safeClearedSteps; stepIndex++) {
      if (explicitStepIndexes && !explicitStepIndexes.has(stepIndex)) continue;
      if (skipAwardedSteps && awardedSteps.has(stepIndex + 1)) continue;
      const bossName = getMissionBossName(mission, stepIndex);
      const sourceContext = {
        bossName,
        bossStep: stepIndex + 1,
      };
      const stepLootConfig = getDungeonStepLootConfig(mission, stepIndex);
      const qualityPriority = getDungeonStepQualityPriority(mission, stepIndex);
      const stepDropCount = getStepDropCount(stepIndex);
      for (let dropIndex = 0; dropIndex < stepDropCount; dropIndex += 1) {
        const drop = pickDungeonDropForParty(
          mission,
          partyMembers,
          qualityPriority,
          {
            includeWorldDrops: stepLootConfig.includeWorldDrops,
            dungeonOnly: stepLootConfig.dungeonOnly,
            worldOnly: stepLootConfig.worldOnly,
            sourceBossName: bossName,
          },
        );
        applyDropResult(drop, sourceContext);
      }

      bonusDrops.forEach((bonusDropConfig) => {
        if (bonusDropConfig.onComplete) return;
        if (Math.random() >= bonusDropConfig.chance) return;
        const bonusDrop = pickDungeonDropForParty(
          mission,
          partyMembers,
          bonusDropConfig.qualityPriority,
          {
            ...bonusDropConfig.options,
            sourceBossName: bossName,
          },
        );
        applyDropResult(bonusDrop, sourceContext);
      });
    }

    if (includeOnCompleteBonus && isFullDungeonClear) {
      bonusDrops.forEach((bonusDropConfig) => {
        if (!bonusDropConfig.onComplete) return;
        if (Math.random() >= bonusDropConfig.chance) return;
        const bonusDrop = pickDungeonDropForParty(
          mission,
          partyMembers,
          bonusDropConfig.qualityPriority,
          bonusDropConfig.options,
        );
        applyDropResult(bonusDrop);
      });
    }

    return { lootMap, discardedDrops };
  };

  const createLootLogsAndRosterUpdate = ({
    currentRoster,
    lootMap,
    missionName,
  }) => {
    const missionLogs = [];
    const updatedRoster = currentRoster.map((char) => {
      const awardedLootItems = lootMap.get(char.id) || [];
      if (awardedLootItems.length === 0) return char;

      const newEquipment = { ...char.equipment };
      awardedLootItems.forEach((lootEntry) => {
        const lootItem = lootEntry?.item || lootEntry;
        if (!lootItem) return;
        const sourceBossName =
          typeof lootEntry?.sourceBossName === "string"
            ? lootEntry.sourceBossName
            : null;
        const sourceBossStep = Number.isFinite(lootEntry?.sourceBossStep)
          ? Number(lootEntry.sourceBossStep)
          : null;
        const currentItem = newEquipment[lootItem.slot];
        const currentItemLevel = getItemEffectiveLevel(currentItem);
        const newItemLevel = getItemEffectiveLevel(lootItem);
        const willEquip = !currentItem || newItemLevel > currentItemLevel;

        if (willEquip) newEquipment[lootItem.slot] = lootItem;

        missionLogs.push({
          type: "loot",
          characterName: char.name,
          itemName: lootItem.name,
          itemQuality: lootItem.quality,
          missionName,
          bossName: sourceBossName,
          bossStep: sourceBossStep,
          equipped: willEquip,
        });
      });

      return {
        ...char,
        equipment: newEquipment,
      };
    });

    return { updatedRoster, missionLogs };
  };

  const processMissionRewards = ({
    mission,
    currentRoster,
    activeGuildStats,
    activeFocusBonuses,
    levelCap,
    failedMissionExpFactor,
  }) => {
    const memberIds = Array.isArray(mission?.memberIds) ? mission.memberIds : [];
    const partyMembers = currentRoster.filter((c) => memberIds.includes(c.id));
    const isDungeon = mission.type === "dungeon";
    const isZoneElite = mission?.isZoneElite === true;
    const dungeonBossCount = isDungeon ? getDungeonBossCount(mission) : 0;
    const dungeonClearedSteps = isDungeon
      ? Math.max(
          0,
          Math.min(dungeonBossCount, Number(mission.dungeonProgress?.clearedSteps) || 0),
        )
      : 0;

    const missionSucceeded = isDungeon
      ? dungeonClearedSteps >= dungeonBossCount
      : mission.missionSuccess !== false;
    const missionClearKey = mission?.questId ?? mission?.id;

    const { lootMap: missionLootMap, discardedDrops } = isDungeon
      ? buildDungeonBossLootMap(mission, partyMembers, {
          clearedSteps: dungeonClearedSteps,
          includeOnCompleteBonus: true,
          skipAwardedSteps: true,
        })
      : missionSucceeded
        ? buildMissionLootMap(mission, partyMembers)
        : { lootMap: new Map(), discardedDrops: 0 };

    const baseMissionGold =
      typeof mission.payoutGold === "number"
        ? Math.max(0, mission.payoutGold)
        : getMissionGoldReward(mission);
    const fullPartySocialBonus =
      memberIds.length >= 5 ? activeFocusBonuses.fullPartyGoldMultiplier : 1;
    const missionGold = missionSucceeded
      ? Math.max(
          0,
          Math.floor(
            baseMissionGold * activeGuildStats.goldMultiplier * fullPartySocialBonus,
          ),
        )
      : 0;

    const baseMissionExpReward = isDungeon
      ? Math.max(
          0,
          Math.floor(
            mission.exp * getDungeonQuarterExpMultiplier(dungeonClearedSteps, dungeonBossCount),
          ),
        )
      : missionSucceeded
        ? mission.exp
      : Math.max(1, Math.floor(mission.exp * failedMissionExpFactor));
    const missionRewardKeyIds = missionSucceeded
      ? Array.isArray(mission?.rewardKeys)
        ? mission.rewardKeys
            .map((keyId) => String(keyId || "").trim())
            .filter(Boolean)
        : []
      : [];

    const missionLogs = [
      {
        type: "mission",
        missionName: mission.name,
        outcome: missionSucceeded ? "success" : "failed",
        successChance:
          typeof mission.successChance === "number" ? mission.successChance : null,
        failChance: typeof mission.failChance === "number" ? mission.failChance : null,
        memberCount: memberIds.length,
        bossesCleared: isDungeon ? dungeonClearedSteps : null,
        totalBosses: isDungeon ? dungeonBossCount : null,
      },
    ];

    if (discardedDrops > 0) {
      missionLogs.push({
        type: "loot-discard",
        missionName: mission.name,
        count: discardedDrops,
      });
    }

    const updatedRoster = currentRoster.map((char) => {
      if (!memberIds.includes(char.id)) return char;

      const dungeonExpMultiplier = isDungeon
        ? getDungeonOverlevelExpMultiplier(char.level, mission)
        : 1;
      const levelCurveExpMultiplier = getMissionLevelExpMultiplier(char.level, mission);
      const missionExpReward = isDungeon
        ? Math.max(
            0,
            Math.floor(
              baseMissionExpReward *
                dungeonExpMultiplier *
                levelCurveExpMultiplier *
                activeGuildStats.expMultiplier *
                activeFocusBonuses.expMultiplier,
            ),
          )
        : Math.max(
            0,
            Math.floor(
              baseMissionExpReward *
                levelCurveExpMultiplier *
                activeGuildStats.expMultiplier *
                activeFocusBonuses.expMultiplier,
            ),
          );

      let newExp = char.exp + missionExpReward;
      let newLevel = char.level;
      let maxExp = getReqExp(newLevel);
      let leveledUp = false;

      while (newExp >= maxExp && newLevel < levelCap) {
        newLevel += 1;
        newExp -= maxExp;
        maxExp = getReqExp(newLevel);
        leveledUp = true;
      }
      if (newLevel >= levelCap) {
        newLevel = levelCap;
        newExp = maxExp;
      }

      const newEquipment = { ...char.equipment };
      const existingClearedMissionIds = Array.isArray(char?.clearedMissionIds)
        ? [...char.clearedMissionIds]
        : [];
      const normalizedClearKey =
        missionClearKey == null ? null : String(missionClearKey);
      const shouldRecordClearedMission =
        missionSucceeded && (isDungeon || mission?.isZoneElite === true);
      const updatedClearedMissionIds =
        shouldRecordClearedMission &&
        normalizedClearKey &&
        !existingClearedMissionIds.some(
          (missionId) => String(missionId) === normalizedClearKey,
        )
          ? [...existingClearedMissionIds, missionClearKey]
          : existingClearedMissionIds;
      const historyEntry = {
        name: mission.name,
        type: mission.type,
        elite: !!mission.elite,
        exp: missionExpReward,
        result: missionSucceeded ? "Success" : "Failed",
        bossesCleared: isDungeon ? dungeonClearedSteps : null,
        time: new Date().toLocaleTimeString(),
        loot: null,
        keys: [],
      };

      const currentKeys = Array.isArray(char.keys)
        ? char.keys
            .map((keyId) => String(keyId || "").trim())
            .filter(Boolean)
        : [];
      const newlyAwardedKeys = missionRewardKeyIds.filter(
        (keyId) => !currentKeys.includes(keyId),
      );
      const updatedKeys =
        newlyAwardedKeys.length > 0
          ? [...currentKeys, ...newlyAwardedKeys]
          : currentKeys;
      historyEntry.keys = newlyAwardedKeys;
      newlyAwardedKeys.forEach((keyId) => {
        missionLogs.push({
          type: "key",
          characterName: char.name,
          keyId,
          keyLabel: typeof getKeyLabel === "function" ? getKeyLabel(keyId) : keyId,
          missionName: mission.name,
        });
      });

      const awardedLootItems = missionLootMap.get(char.id) || [];
      awardedLootItems.forEach((lootEntry, index) => {
        const lootItem = lootEntry?.item || lootEntry;
        if (!lootItem) return;
        const sourceBossName =
          typeof lootEntry?.sourceBossName === "string"
            ? lootEntry.sourceBossName
            : null;
        const sourceBossStep = Number.isFinite(lootEntry?.sourceBossStep)
          ? Number(lootEntry.sourceBossStep)
          : null;
        const currentItem = newEquipment[lootItem.slot];
        const currentItemLevel = getItemEffectiveLevel(currentItem);
        const newItemLevel = getItemEffectiveLevel(lootItem);
        const willEquip = !currentItem || newItemLevel > currentItemLevel;

        if (willEquip) newEquipment[lootItem.slot] = lootItem;
        if (index === 0) historyEntry.loot = lootItem;

        missionLogs.push({
          type: "loot",
          characterName: char.name,
          itemName: lootItem.name,
          itemQuality: lootItem.quality,
          missionName: mission.name,
          bossName: sourceBossName,
          bossStep: sourceBossStep,
          equipped: willEquip,
        });
      });

      const moraleAdjustedChar =
        missionSucceeded &&
        isDungeon &&
        isCharacterInMissionLevelRange(char, mission)
          ? applyMoraleDelta(char, MORALE_DUNGEON_CLEAR_DELTA)
          : isZoneElite && isCharacterInMissionLevelRange(char, mission)
            ? applyMoraleDelta(
                char,
                missionSucceeded
                  ? MORALE_ELITE_SUCCESS_DELTA
                  : MORALE_ELITE_FAILURE_DELTA,
              )
            : char;

      const goalAdjustedChar =
        missionSucceeded && newlyAwardedKeys.length > 0
          ? clearCompletedAdventureGoals({
              character: moraleAdjustedChar,
              awardedKeyIds: newlyAwardedKeys,
            })
          : moraleAdjustedChar;

      return {
        ...goalAdjustedChar,
        status: "Idle",
        statusText: missionSucceeded
          ? "Returning from Mission..."
          : "Recovering from failed mission...",
        level: newLevel,
        exp: newExp,
        maxExp,
        lastLevelUp: leveledUp ? Date.now() : char.lastLevelUp,
        history: [historyEntry, ...char.history],
        keys: updatedKeys,
        clearedMissionIds: updatedClearedMissionIds,
        equipment: newEquipment,
      };
    });

    return { updatedRoster, missionLogs, missionGold, missionSucceeded };
  };

  processMissionRewards.awardDungeonStepLoot = ({
    mission,
    currentRoster,
    stepLog,
  }) => {
    if (mission?.type !== "dungeon" || stepLog?.outcome !== "cleared") {
      return { mission, updatedRoster: currentRoster, missionLogs: [] };
    }

    const stepNumber = Math.floor(Number(stepLog?.step) || 0);
    const dungeonBossCount = getDungeonBossCount(mission);
    if (stepNumber <= 0 || stepNumber > dungeonBossCount) {
      return { mission, updatedRoster: currentRoster, missionLogs: [] };
    }

    const awardedSteps = getAwardedDungeonLootSteps(mission);
    if (awardedSteps.has(stepNumber)) {
      return { mission, updatedRoster: currentRoster, missionLogs: [] };
    }

    const memberIds = Array.isArray(mission?.memberIds) ? mission.memberIds : [];
    const partyMembers = currentRoster.filter((char) => memberIds.includes(char.id));
    const { lootMap, discardedDrops } = buildDungeonBossLootMap(
      mission,
      partyMembers,
      {
        clearedSteps: stepNumber,
        stepIndexes: [stepNumber - 1],
        includeOnCompleteBonus: false,
        skipAwardedSteps: false,
      },
    );
    const { updatedRoster, missionLogs } = createLootLogsAndRosterUpdate({
      currentRoster,
      lootMap,
      missionName: mission.name,
    });
    const nextAwardedSteps = [...awardedSteps, stepNumber].sort(
      (left, right) => left - right,
    );
    const updatedMission = {
      ...mission,
      dungeonProgress: {
        ...(mission.dungeonProgress || {}),
        lootAwardedSteps: nextAwardedSteps,
      },
    };
    const discardLogs =
      discardedDrops > 0
        ? [
            {
              type: "loot-discard",
              missionName: mission.name,
              bossName: stepLog.bossName || getMissionBossName(mission, stepNumber - 1),
              bossStep: stepNumber,
              count: discardedDrops,
            },
          ]
        : [];

    return {
      mission: updatedMission,
      updatedRoster,
      missionLogs: [...discardLogs, ...missionLogs],
    };
  };

  return processMissionRewards;
};
