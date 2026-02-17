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
  const getItemDungeonKeys = (item) => {
    const keys = [];
    if (typeof item?.dungeon === "string" && item.dungeon.trim()) {
      keys.push(item.dungeon.trim());
    }
    if (typeof item?.dungeonSetId === "string" && item.dungeonSetId.trim()) {
      keys.push(item.dungeonSetId.trim());
    }
    return keys;
  };

  const getMissionDungeonKeys = (mission) => {
    const keys = [];
    if (typeof mission?.name === "string" && mission.name.trim()) {
      keys.push(mission.name.trim());
    }
    if (typeof mission?.dungeonSetId === "string" && mission.dungeonSetId.trim()) {
      keys.push(mission.dungeonSetId.trim());
    }
    return keys;
  };

  const getMissionLootCandidatesForCharacter = (mission, char, quality) => {
    const classInfo = dbClasses?.[char?.charClass];
    if (!classInfo) return [];

    const allowedTypes = getClassArmorTypes(char.charClass, char.level);
    const { minLevel, maxLevel } = getMissionLootLevelRange(mission);

    return dbItems.filter((item) => {
      if (item.quality !== quality) return false;
      if (item.minLevel < minLevel || item.minLevel > maxLevel) return false;

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

    return dbItems.filter((item) => {
      if (item.quality !== quality) return false;
      if (item.minLevel < minLevel || item.minLevel > maxLevel) return false;

      const itemDungeonKeys = getItemDungeonKeys(item);
      if (mission.type === "dungeon") {
        const missionKeys = new Set(getMissionDungeonKeys(mission));
        const isMatchingDungeonLoot = itemDungeonKeys.some((key) =>
          missionKeys.has(key),
        );
        if (worldOnly) return itemDungeonKeys.length === 0;
        if (itemDungeonKeys.length > 0) return isMatchingDungeonLoot;
        if (dungeonOnly) return false;
        return includeWorldDrops;
      }

      return itemDungeonKeys.length === 0;
    });
  };

  const canCharacterUseItem = (char, item) => {
    if (!char || !item) return false;
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

      const usableItems = qualityPool.filter((item) =>
        partyMembers.some((member) => canCharacterUseItem(member, item)),
      );
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

  const buildMissionLootMap = (mission, partyMembers) => {
    const lootMap = new Map(partyMembers.map((member) => [member.id, []]));
    if (partyMembers.length === 0) return { lootMap, discardedDrops: 0 };

    const rewardQualities = resolveMissionRewardQualities(mission);
    partyMembers.forEach((member) => {
      const quality =
        rewardQualities[Math.floor(Math.random() * rewardQualities.length)] || 1;
      const item = pickMissionLootForCharacter(mission, member, quality, true);
      if (!item) return;
      lootMap.get(member.id)?.push(item);
    });

    return { lootMap, discardedDrops: 0 };
  };

  const buildDungeonBossLootMap = (mission, partyMembers, clearedSteps) => {
    const lootMap = new Map(partyMembers.map((member) => [member.id, []]));
    const dungeonBossCount = getDungeonBossCount(mission);
    const safeClearedSteps = Math.max(0, Math.min(dungeonBossCount, clearedSteps));
    let discardedDrops = 0;

    const applyDropResult = (dropResult) => {
      if (!dropResult || dropResult.discarded || !dropResult.item) {
        discardedDrops += 1;
        return;
      }
      lootMap.get(dropResult.winnerId)?.push(dropResult.item);
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

    for (let stepIndex = 0; stepIndex < safeClearedSteps; stepIndex++) {
      const stepLootConfig = getDungeonStepLootConfig(mission, stepIndex);
      const qualityPriority = getDungeonStepQualityPriority(mission, stepIndex);
      const drop = pickDungeonDropForParty(mission, partyMembers, qualityPriority, {
        includeWorldDrops: stepLootConfig.includeWorldDrops,
        dungeonOnly: stepLootConfig.dungeonOnly,
        worldOnly: stepLootConfig.worldOnly,
      });
      applyDropResult(drop);

      bonusDrops.forEach((bonusDropConfig) => {
        if (bonusDropConfig.onComplete) return;
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

    if (isFullDungeonClear) {
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

  return ({
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

    const { lootMap: missionLootMap, discardedDrops } = isDungeon
      ? buildDungeonBossLootMap(mission, partyMembers, dungeonClearedSteps)
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
      awardedLootItems.forEach((lootItem, index) => {
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
          equipped: willEquip,
        });
      });

      return {
        ...char,
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
        equipment: newEquipment,
      };
    });

    return { updatedRoster, missionLogs, missionGold, missionSucceeded };
  };
};
