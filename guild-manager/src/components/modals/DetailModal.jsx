import { useEffect, useState } from "react";
import { DB_CLASSES, PROFESSIONS_LIST } from "../../constants";
import {
  getCharacterAverageItemLevel,
  getCharacterPowerScore,
  getCharacterSetBonus,
  getEquipmentSetBonuses,
  formatItemStats,
  getClassArmorText,
  getKeyIconUrl,
  getKeyLabel,
  getItemIconUrl,
  getItemEffectiveLevel,
  getQualityColor,
  getRacePortraitUrl,
  getReqExp,
  getRoleIcon,
  getWowIconUrl,
  normalizeEquipmentSlots,
} from "../../utils";
import {
  getCharacterActivityModeDescription,
  getNextTierLevel,
  getSkillCap,
} from "../../game/characterActivity";
import {
  getCharacterMorale,
  getMoraleLabel,
  getMoraleSuccessModifier,
} from "../../game/characterMorale";
import { getCharacterPersonalityTraits } from "../../game/characterPersonality";
import { ensureCharacterPvpData } from "../../pvp/pvpCharacterUtils";
import {
  getPvpRewardTiersForRank,
  getUnlockedPvpGearForCharacter,
} from "../../pvp/pvpGearUnlocks";
import { getPvpRankProgressInfo } from "../../pvp/pvpRanks";
import {
  ZONE_COMPLETION_ARCHETYPE,
  ZONE_DEFINITIONS,
  getCharacterZonePreference,
  getZoneById,
} from "../../zones/zoneDefinitions";
import { getRaidLockoutStatus } from "../../raids/raidLockouts";
import { getCharacterRelationshipRows } from "../../social/relationshipSystem";
import BaseModal from "./BaseModal";

const ZONE_ARCHETYPE_LABEL = Object.freeze({
  [ZONE_COMPLETION_ARCHETYPE.GEAR_SEEKER]: "Gear Seeker",
  [ZONE_COMPLETION_ARCHETYPE.COMPLETIONIST]: "Completionist",
  [ZONE_COMPLETION_ARCHETYPE.WANDERER]: "Wanderer",
  [ZONE_COMPLETION_ARCHETYPE.AVOIDANT]: "Cautious Pathfinder",
});

const ZONE_ARCHETYPE_DESCRIPTION = Object.freeze({
  [ZONE_COMPLETION_ARCHETYPE.GEAR_SEEKER]:
    "Prioritizes high-end regions where useful gear can still drop.",
  [ZONE_COMPLETION_ARCHETYPE.COMPLETIONIST]:
    "Starts with lower-level regions and works upward through the world.",
  [ZONE_COMPLETION_ARCHETYPE.WANDERER]:
    "Lets favorite places and enemies pull them toward certain zones first.",
  [ZONE_COMPLETION_ARCHETYPE.AVOIDANT]:
    "Avoids disliked places and enemies when another unfinished zone is available.",
});

const formatPreferenceTag = (tag) =>
  String(tag || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const PreferencePills = ({ values, tone = "emerald" }) => {
  const entries = (Array.isArray(values) ? values : []).filter(Boolean);
  if (entries.length === 0) {
    return <span className="text-xs text-gray-500 italic">None</span>;
  }
  const toneClass =
    tone === "red"
      ? "border-red-800 bg-red-950/25 text-red-100"
      : "border-emerald-800 bg-emerald-950/25 text-emerald-100";
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry) => (
        <span
          key={entry}
          className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${toneClass}`}
        >
          {formatPreferenceTag(entry)}
        </span>
      ))}
    </div>
  );
};

const formatRelationshipActivity = (activityType) => {
  const type = String(activityType || "").trim();
  if (type === "dungeon") return "Dungeon";
  if (type === "raid") return "Raid";
  if (type === "elite") return "Elite Quest";
  return "Shared Activity";
};

const formatRelationshipEventDate = (occurredAt) => {
  const timestamp = Number(occurredAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  return new Date(timestamp).toLocaleString();
};

const ARMORY_LEFT_SLOTS = Object.freeze([
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
]);
const ARMORY_RIGHT_SLOTS = Object.freeze([
  "hands",
  "belt",
  "legs",
  "feet",
  "ring",
  "trinket",
]);
const ARMORY_BOTTOM_SLOTS = Object.freeze(["mainHand"]);

const formatEquipmentSlotLabel = (slotName) =>
  String(slotName || "")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ArmoryItemSlot = ({ slotName, item, align = "left" }) => {
  const borderColor = item ? getQualityColor(item.quality) : "#444";
  const itemStats = formatItemStats(item?.stats);
  const itemLevel = getItemEffectiveLevel(item);
  const setName = String(item?.setName || "").trim();
  const icon = (
    <div
      className="h-12 w-12 flex-none rounded-md border bg-black/50 p-0.5 shadow-inner"
      style={{ borderColor }}
    >
      <img
        src={getItemIconUrl(item, slotName)}
        alt={item ? item.name : slotName}
        className="h-full w-full rounded object-cover"
        onError={(event) => {
          event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
        }}
      />
    </div>
  );
  const textAlignClass = align === "right" ? "items-end text-right" : "items-start";

  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-md border border-gray-800 bg-gray-950/35 px-3 py-2 shadow-sm transition-colors hover:border-amber-900/70 hover:bg-gray-900/70">
      {align !== "right" && icon}
      <div className={`flex min-w-0 flex-1 flex-col ${textAlignClass}`}>
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">
          {formatEquipmentSlotLabel(slotName)}
        </div>
        <div
          className={`max-w-full truncate text-sm font-bold ${!item ? "text-gray-600 italic" : ""}`}
          style={{ color: item ? borderColor : undefined }}
        >
          {item ? item.name : "Empty"}
        </div>
        <div className="text-[10px] text-amber-200/70">iLvl {itemLevel}</div>
        {setName && (
          <div className="mt-0.5 inline-flex max-w-full items-center rounded border border-emerald-800 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
            <span className="truncate">Set: {setName}</span>
          </div>
        )}
        {itemStats && (
          <div className="max-w-full truncate text-[10px] text-emerald-300">
            {itemStats}
          </div>
        )}
      </div>
      {align === "right" && icon}
    </div>
  );
};

const DetailModal = ({
  char,
  isOpen,
  missionAchievementCatalog = [],
  missionList = [],
  itemDatabase = [],
  roster = [],
  guildFaction,
  guildRelationships = {},
  raidLockouts = {},
  currentDayIndex = 0,
  onClose,
  onDismiss,
  onLevelChange,
  onRoleChange,
  onProfChange,
  onModeChange,
}) => {
  const [tab, setTab] = useState("stats");
  const [historyPage, setHistoryPage] = useState(0);
  const [relationshipsOpen, setRelationshipsOpen] = useState(false);
  const [relationshipHistoryOpenByKey, setRelationshipHistoryOpenByKey] =
    useState({});
  const HISTORY_PAGE_SIZE = 8;
  const characterId = char?.id;
  const classData = DB_CLASSES[char?.charClass];
  const zonePreference = getCharacterZonePreference(char);
  const zoneArchetypeLabel =
    ZONE_ARCHETYPE_LABEL[zonePreference.archetype] || "Adventurer";
  const zoneArchetypeDescription =
    ZONE_ARCHETYPE_DESCRIPTION[zonePreference.archetype] ||
    "Follows their own instincts when choosing unfinished zones.";
  const morale = getCharacterMorale(char);
  const moraleLabel = getMoraleLabel(morale);
  const moraleSuccessModifier = getMoraleSuccessModifier(char);
  const moraleEffectText =
    moraleSuccessModifier > 0
      ? `+${moraleSuccessModifier}% mission success`
      : moraleSuccessModifier < 0
        ? `${moraleSuccessModifier}% mission success`
        : "No mission success modifier";
  const personalityTraits = getCharacterPersonalityTraits(char);
  const pvpCharacter = ensureCharacterPvpData(char, guildFaction);
  const pvpInfo = getPvpRankProgressInfo(pvpCharacter, guildFaction);
  const unlockedPvpGear = getUnlockedPvpGearForCharacter(
    pvpCharacter,
    itemDatabase,
    guildFaction,
  );
  const unlockedPvpRewardTiers = getPvpRewardTiersForRank(
    pvpCharacter.pvp.highestRank,
  );
  const displayEquipment = normalizeEquipmentSlots(char?.equipment);
  const unlockedEquippedPvpGear = unlockedPvpGear.filter(
    (item) => displayEquipment[item.slot]?.id === item.id,
  );
  const unlockedStoredPvpGear = unlockedPvpGear.filter(
    (item) => displayEquipment[item.slot]?.id !== item.id,
  );
  const nextPvpRankLabel = pvpInfo.nextRank
    ? `${pvpInfo.nextRank.title} (Rank ${pvpInfo.nextRank.rank})`
    : "Highest rank reached";

  const hardCap = getSkillCap(char?.level || 1);
  const averageItemLevel = getCharacterAverageItemLevel(char);
  const characterPower = getCharacterPowerScore(char);
  const setBonus = getCharacterSetBonus(char);
  const activeSetBonuses = getEquipmentSetBonuses(char?.equipment);
  const historyEntries = Array.isArray(char?.history) ? char.history : [];
  const relationshipRows = getCharacterRelationshipRows({
    relationships: guildRelationships,
    characterId: char?.id,
    roster,
  });
  const characterKeys = Array.isArray(char?.keys)
    ? [...new Set(char.keys.map((keyId) => String(keyId || "").trim()).filter(Boolean))]
    : [];
  const clearedMissionIdSet = new Set(
    (Array.isArray(char?.clearedMissionIds) ? char.clearedMissionIds : [])
      .map((missionId) => String(missionId || "").trim())
      .filter(Boolean),
  );
  const uniqueAchievementMissions = (() => {
    const source = Array.isArray(missionAchievementCatalog)
      ? missionAchievementCatalog
      : [];
    const seen = new Set();
    const rows = [];
    source.forEach((mission) => {
      const missionId = String(mission?.id || "").trim();
      if (!missionId || seen.has(missionId)) return;
      seen.add(missionId);
      rows.push({
        id: mission.id,
        label: mission?.label || mission?.name || "Dungeon",
        isRaid: mission?.isRaid === true,
        recommended: mission?.recommended || null,
        minLevel: Number.isFinite(mission?.minLevel)
          ? Math.max(1, Number(mission.minLevel))
          : null,
        entryLevel: Number.isFinite(mission?.entryLevel)
          ? Math.max(1, Number(mission.entryLevel))
          : null,
      });
    });
    return rows;
  })();
  const dungeonAchievementMissions = uniqueAchievementMissions.filter(
    (mission) => !mission.isRaid,
  );
  const raidAchievementMissions = uniqueAchievementMissions.filter(
    (mission) => mission.isRaid,
  );
  const clearedDungeonAchievementCount = dungeonAchievementMissions.filter((mission) =>
    clearedMissionIdSet.has(String(mission.id)),
  ).length;
  const clearedRaidAchievementCount = raidAchievementMissions.filter((mission) =>
    clearedMissionIdSet.has(String(mission.id)),
  ).length;
  const clearedAchievementCount = uniqueAchievementMissions.filter((mission) =>
    clearedMissionIdSet.has(String(mission.id)),
  ).length;
  const MIN_KEY_SLOTS = 4;
  const visibleKeySlots = Array.from(
    { length: Math.max(MIN_KEY_SLOTS, characterKeys.length) },
    (_, index) => characterKeys[index] || null,
  );
  const characterRaidLockouts = (Array.isArray(missionList) ? missionList : [])
    .filter((mission) => mission?.isRaid)
    .map((mission) => {
      const status = getRaidLockoutStatus({
        raidLockouts,
        mission,
        currentDayIndex,
        memberIds: [char?.id],
      });
      const lockout = status.partyLockouts?.[0] || null;
      if (!lockout) return null;
      return {
        key: `${mission.id}-${lockout.lockoutId}`,
        raidName: mission.dungeonSetName || mission.name || lockout.raidName || "Raid",
        displayId: lockout.displayId,
        clearedSteps: status.clearedSteps,
        totalBosses: status.totalBosses,
        completed: lockout.completed,
        resetDaysRemaining: Math.max(
          0,
          Math.floor(Number(status.resetWindow?.nextResetDayIndex) || 0) -
            Math.max(0, Math.floor(Number(currentDayIndex) || 0)),
        ),
      };
    })
    .filter(Boolean);
  const historyPageCount = Math.max(1, Math.ceil(historyEntries.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(historyPage, historyPageCount - 1);
  const historyStart = currentPage * HISTORY_PAGE_SIZE;
  const historyEnd = historyStart + HISTORY_PAGE_SIZE;
  const visibleHistory = historyEntries.slice(historyStart, historyEnd);
  const zoneProgressByIdRaw =
    char?.zoneProgressById && typeof char.zoneProgressById === "object"
      ? char.zoneProgressById
      : {};
  const zoneProgressById = Object.entries(zoneProgressByIdRaw).reduce((acc, [zoneId, progress]) => {
    const zone = getZoneById(zoneId);
    if (!zone) return acc;
    acc[zone.id] = Math.max(0, Math.min(100, Number(progress) || 0));
    return acc;
  }, {});
  const currentZone = getZoneById(char?.currentZoneId);
  const currentZoneProgress = Math.max(
    0,
    Math.min(
      100,
      Number(
        char?.currentZoneProgress ??
          (currentZone ? zoneProgressById[currentZone.id] : 0) ??
          0,
      ) || 0,
    ),
  );
  if (currentZone) {
    zoneProgressById[currentZone.id] = Math.max(
      zoneProgressById[currentZone.id] || 0,
      currentZoneProgress,
    );
  }
  const zonesClearedSet = new Set(
    (Array.isArray(char?.zonesCleared) ? char.zonesCleared : [])
      .map((zoneId) => String(zoneId || "").trim())
      .filter(Boolean),
  );
  const zoneRows = [...ZONE_DEFINITIONS]
    .filter((zone) => {
      if (zone.id === currentZone?.id) return true;
      if (zonesClearedSet.has(zone.id)) return true;
      return (zoneProgressById[zone.id] || 0) > 0;
    })
    .sort((left, right) => {
      if (left.id === currentZone?.id) return -1;
      if (right.id === currentZone?.id) return 1;
      if (left.minLevel !== right.minLevel) return left.minLevel - right.minLevel;
      if (left.maxLevel !== right.maxLevel) return left.maxLevel - right.maxLevel;
      return left.name.localeCompare(right.name);
    });

  useEffect(() => {
    if (isOpen && characterId) {
      setHistoryPage(0);
      setRelationshipsOpen(false);
      setRelationshipHistoryOpenByKey({});
    }
  }, [isOpen, characterId]);

  if (!isOpen || !char || !classData) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-gray-600 rounded-none md:rounded-lg w-full max-w-4xl h-full md:h-[80vh] flex flex-col relative shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 bg-gray-900 z-10">
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={getRacePortraitUrl(char.race, char.gender)}
                alt={`${char.race} ${char.gender}`}
                className="w-12 h-12 rounded border border-gray-600 object-cover flex-none"
                onError={(event) => {
                  event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                }}
              />
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  {char.name}{" "}
                  <span className="text-lg text-gray-500">{char.gender === "Male" ? "♂️" : "♀️"}</span>
                </h2>
                <div className="text-sm text-gray-400">
                  {char.race}{" "}
                  <span className="inline-flex items-center gap-1" style={{ color: classData.color }}>
                    {classData.icon && (
                      <img
                        src={classData.icon}
                        alt={char.charClass}
                        className="w-4 h-4 rounded-sm border border-gray-600"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    {char.charClass}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Can wear: {getClassArmorText(char.charClass, char.level)}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-3xl px-2">
              &times;
            </button>
          </div>

          <div className="mt-3 flex justify-center">
            <div className="inline-flex flex-wrap justify-center gap-1">
              {classData.allowedRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(char.id, role)}
                  className={`px-3 py-1.5 text-xs md:text-sm uppercase rounded border transition-colors ${char.role === role ? "bg-blue-600 border-blue-400 text-white" : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"}`}
                >
                  {getRoleIcon(role)} {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap border-b border-gray-700 bg-gray-800">
          <button
            onClick={() => setTab("stats")}
            className={`min-w-[132px] flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "stats" ? "text-white border-b-2 border-blue-500 bg-gray-700" : "text-gray-500"}`}
          >
            Stats & Gear
          </button>
          <button
            onClick={() => setTab("profs")}
            className={`min-w-[132px] flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "profs" ? "text-white border-b-2 border-yellow-500 bg-gray-700" : "text-gray-500"}`}
          >
            Professions
          </button>
          <button
            onClick={() => setTab("pvp")}
            className={`min-w-[132px] flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "pvp" ? "text-white border-b-2 border-orange-500 bg-gray-700" : "text-gray-500"}`}
          >
            PvP
          </button>
          <button
            onClick={() => setTab("personality")}
            className={`min-w-[132px] flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "personality" ? "text-white border-b-2 border-purple-500 bg-gray-700" : "text-gray-500"}`}
          >
            Personality
          </button>
          <button
            onClick={() => setTab("zones")}
            className={`min-w-[132px] flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "zones" ? "text-white border-b-2 border-emerald-500 bg-gray-700" : "text-gray-500"}`}
          >
            Zones
          </button>
          <button
            onClick={() => setTab("achievements")}
            className={`min-w-[132px] flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "achievements" ? "text-white border-b-2 border-amber-500 bg-gray-700" : "text-gray-500"}`}
          >
            Achievements
          </button>
        </div>

        <div className="overflow-y-auto p-4 md:p-6 custom-scrollbar flex-1 bg-gray-900">
          {tab === "stats" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full">
                  <div className="mb-2">
                    <div className="text-base md:text-lg font-bold text-gray-200 flex items-center gap-2">
                      <span>Level {char.level}</span>
                      <span className="inline-flex text-xs px-2 py-1 rounded whitespace-nowrap border border-amber-700 bg-amber-950/35 text-amber-200 font-bold">
                        iLvl {averageItemLevel.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden border border-gray-600">
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${Math.min(100, (char.exp / getReqExp(char.level)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {char.exp} / {getReqExp(char.level)} XP
                  </div>
                  <div className="mt-2 text-xs text-cyan-200/85 font-semibold">
                    Power Score: {characterPower.toFixed(1)}
                  </div>
                  {setBonus > 0 && (
                    <div className="mt-1 text-xs text-emerald-300/90 font-semibold">
                      Set Bonus: +{setBonus} iLvl / Power
                    </div>
                  )}
                  {activeSetBonuses.length > 0 && (
                    <div className="mt-1 text-[11px] text-emerald-200/80">
                      {activeSetBonuses.map((entry) => (
                        <div key={`${char.id}-set-${entry.setId}`}>
                          {entry.setName}: {entry.pieces} pieces (+{entry.bonus})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-amber-900/45 bg-black/20 p-3 md:p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
                  <div className="space-y-2.5">
                    {ARMORY_LEFT_SLOTS.map((slot) => (
                      <ArmoryItemSlot
                        key={`${char.id}-armory-left-${slot}`}
                        slotName={slot}
                        item={displayEquipment[slot]}
                      />
                    ))}
                  </div>
                  <div className="space-y-2.5">
                    {ARMORY_RIGHT_SLOTS.map((slot) => (
                      <ArmoryItemSlot
                        key={`${char.id}-armory-right-${slot}`}
                        slotName={slot}
                        item={displayEquipment[slot]}
                        align="right"
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.4fr_1fr]">
                  <div className="hidden lg:block"></div>
                  {ARMORY_BOTTOM_SLOTS.map((slot) => (
                    <ArmoryItemSlot
                      key={`${char.id}-armory-bottom-${slot}`}
                      slotName={slot}
                      item={displayEquipment[slot]}
                    />
                  ))}
                  <div className="hidden lg:block"></div>
                </div>
              </div>

              <div className="mt-4 bg-gray-800/50 p-3 rounded border border-amber-900/50">
                <h3 className="text-[10px] text-amber-400 uppercase tracking-widest mb-2 font-bold">
                  Keys
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleKeySlots.map((keyId, index) => (
                    <div
                      key={`${char.id}-key-slot-${index}-${keyId || "empty"}`}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-semibold ${
                        keyId
                          ? "border-amber-800 bg-amber-950/25 text-amber-100"
                          : "border-gray-700 bg-gray-900/40 text-gray-500"
                      }`}
                    >
                      <img
                        src={keyId ? getKeyIconUrl(keyId) : getWowIconUrl("inv_misc_key_03")}
                        alt={keyId ? getKeyLabel(keyId) : "Empty key slot"}
                        className={`w-4 h-4 rounded-sm border object-cover ${
                          keyId ? "border-amber-900/80" : "border-gray-700 opacity-50"
                        }`}
                        onError={(event) => {
                          event.currentTarget.src = getWowIconUrl("inv_misc_key_03");
                        }}
                      />
                      <span>{keyId ? getKeyLabel(keyId) : "Empty slot"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 bg-gray-800/50 p-3 rounded border border-cyan-900/50">
                <h3 className="text-[10px] text-cyan-300 uppercase tracking-widest mb-2 font-bold">
                  Raid IDs
                </h3>
                {characterRaidLockouts.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">
                    No active raid IDs this lockout.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {characterRaidLockouts.map((raidLockout) => (
                      <div
                        key={`${char.id}-raid-id-${raidLockout.key}`}
                        className={`rounded border px-2 py-2 text-xs ${
                          raidLockout.completed
                            ? "border-red-800 bg-red-950/20 text-red-100"
                            : "border-cyan-800 bg-cyan-950/20 text-cyan-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold truncate">{raidLockout.raidName}</span>
                          <span className="font-mono whitespace-nowrap">
                            ID {raidLockout.displayId}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-300">
                          {raidLockout.clearedSteps}/{raidLockout.totalBosses} bosses cleared
                          {raidLockout.completed ? " - completed" : ""}
                          {raidLockout.resetDaysRemaining > 0
                            ? ` - resets in ${raidLockout.resetDaysRemaining} day${
                                raidLockout.resetDaysRemaining === 1 ? "" : "s"
                              }`
                            : " - resets today"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 items-center mt-4">
                <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-700">
                  <span className="text-xs text-gray-500 uppercase mr-1">Debug Level</span>
                  <button
                    onClick={() => onLevelChange(char.id, -1)}
                    className="w-5 h-5 bg-gray-700 rounded text-white flex items-center justify-center"
                  >
                    -
                  </button>
                  <button
                    onClick={() => onLevelChange(char.id, 1)}
                    className="w-5 h-5 bg-gray-700 rounded text-white flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => onDismiss(char.id)}
                  className="ml-auto text-red-400 text-xs border border-red-900 px-3 py-1 rounded hover:bg-red-900/20"
                >
                  Dismiss Hero
                </button>
              </div>

              <div className="mt-4 bg-gray-800/50 p-3 rounded border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                    Mission History
                  </h3>
                  {historyEntries.length > 0 && (
                    <span className="text-[10px] text-gray-500">
                      Page {currentPage + 1}/{historyPageCount}
                    </span>
                  )}
                </div>
                {historyEntries.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">No missions completed yet.</div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {visibleHistory.map((entry, idx) => {
                        const missionTypeLabel =
                          entry.type === "dungeon" ? "Dungeon" : entry.elite ? "Elite Quest" : "Quest";
                        const missionResult = entry.result === "Failed" ? "Failed" : "Success";
                        return (
                          <div
                            key={`${entry.time}-${entry.name}-${idx}`}
                            className="text-xs border border-gray-700 rounded p-2 bg-gray-900/50"
                          >
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-bold text-gray-200 truncate">{entry.name}</span>
                              <span className="text-gray-500 whitespace-nowrap">{entry.time}</span>
                            </div>
                            <div
                              className={`mt-1 ${
                                missionResult === "Failed" ? "text-red-300" : "text-gray-400"
                              }`}
                            >
                              {missionTypeLabel} • {missionResult === "Failed" ? "Failed" : "Success"} • +{entry.exp} XP
                            </div>
                            {Array.isArray(entry.keys) && entry.keys.length > 0 && (
                              <div className="mt-1 text-[11px] text-amber-200">
                                Key Reward:{" "}
                                {entry.keys.map((keyId, keyIndex) => (
                                  <span key={`${entry.name}-${entry.time}-${keyId}`}>
                                    [{getKeyLabel(keyId)}]
                                    {keyIndex < entry.keys.length - 1 ? " + " : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {historyPageCount > 1 && (
                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                          disabled={currentPage === 0}
                          className="text-xs px-2 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            setHistoryPage((p) => Math.min(historyPageCount - 1, p + 1))
                          }
                          disabled={currentPage >= historyPageCount - 1}
                          className="text-xs px-2 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {tab === "pvp" && (
            <div className="space-y-5">
              <div className="rounded border border-orange-900/60 bg-orange-950/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-orange-300/75">
                      Current Rank
                    </div>
                    <div className="mt-1 text-xl font-bold text-orange-100">
                      {pvpCharacter.pvp.title}{" "}
                      <span className="text-sm text-orange-200/70">
                        Rank {pvpCharacter.pvp.rank}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-orange-100/70">
                      Highest: {pvpCharacter.pvp.highestTitle} (Rank {pvpCharacter.pvp.highestRank})
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded border border-orange-900/50 bg-gray-950/35 px-3 py-2">
                      <div className="text-orange-200 font-bold">{pvpCharacter.pvp.weeklyHonor}</div>
                      <div className="text-orange-100/60">Weekly</div>
                    </div>
                    <div className="rounded border border-orange-900/50 bg-gray-950/35 px-3 py-2">
                      <div className="text-orange-200 font-bold">{pvpCharacter.pvp.lifetimeHonor}</div>
                      <div className="text-orange-100/60">Lifetime</div>
                    </div>
                    <div className="rounded border border-orange-900/50 bg-gray-950/35 px-3 py-2">
                      <div className="text-orange-200 font-bold">{pvpCharacter.pvp.honorableKills}</div>
                      <div className="text-orange-100/60">HKs</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-orange-100/75">
                    <span>Rank Progress</span>
                    <span>
                      {pvpInfo.nextRank
                        ? `${pvpCharacter.pvp.rankProgress} / ${pvpInfo.nextRequired}`
                        : `${pvpCharacter.pvp.rankProgress}`}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-gray-950 border border-orange-950">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${pvpInfo.percentToNext}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 text-xs text-orange-100/65">
                    {pvpInfo.nextRank
                      ? `Next: ${nextPvpRankLabel}`
                      : "Maximum PvP rank reached"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded border border-gray-700 bg-gray-800/45 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300">
                    Reward Tiers
                  </h3>
                  {unlockedPvpRewardTiers.length === 0 ? (
                    <div className="mt-3 text-sm text-gray-500 italic">
                      No PvP rewards unlocked yet.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {unlockedPvpRewardTiers.map((tier) => (
                        <div
                          key={`pvp-tier-${tier.rank}`}
                          className="flex items-center justify-between gap-3 rounded border border-orange-900/45 bg-gray-950/25 px-3 py-2 text-sm"
                        >
                          <span className="font-semibold text-orange-100">
                            Rank {tier.rank}
                          </span>
                          <span className="text-right text-orange-100/75">{tier.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded border border-gray-700 bg-gray-800/45 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300">
                    PvP Gear
                  </h3>
                  <div className="mt-2 text-xs text-gray-400">
                    {unlockedPvpGear.length} unlocked, {unlockedEquippedPvpGear.length} equipped
                  </div>
                  {unlockedPvpGear.length === 0 ? (
                    <div className="mt-3 text-sm text-gray-500 italic">
                      Earn honor and finish a PvP week to unlock gear.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {[...unlockedEquippedPvpGear, ...unlockedStoredPvpGear].map((item) => {
                        const equipped = displayEquipment[item.slot]?.id === item.id;
                        return (
                          <div
                            key={`pvp-gear-${item.id}`}
                            className="flex items-center gap-3 rounded border border-gray-700 bg-gray-950/25 p-2"
                          >
                            <img
                              src={getItemIconUrl(item, item.slot)}
                              alt={item.name}
                              className="h-9 w-9 rounded border border-gray-700 object-cover"
                              onError={(event) => {
                                event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                className="truncate text-sm font-bold"
                                style={{ color: getQualityColor(item.quality) }}
                              >
                                {item.name}
                              </div>
                              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                                {item.slot} · iLvl {getItemEffectiveLevel(item)}
                              </div>
                            </div>
                            <span
                              className={`rounded border px-2 py-1 text-[10px] font-bold uppercase ${
                                equipped
                                  ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                                  : "border-gray-700 bg-gray-900 text-gray-400"
                              }`}
                            >
                              {equipped ? "Equipped" : "Unlocked"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "profs" && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-4 rounded border border-gray-700">
                <h3 className="text-sm font-bold text-gray-300 uppercase mb-4">Activity Focus</h3>
                <div className="flex gap-2">
                  {["Leveling", "Professions", "Auto"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onModeChange(char.id, mode)}
                      className={`flex-1 py-2 rounded border text-sm font-bold transition-colors ${char.activityMode === mode ? (mode === "Auto" ? "bg-purple-900 border-purple-500 text-white" : "bg-blue-900 border-blue-500 text-white") : "bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600"}`}
                    >
                      {mode === "Auto" ? "🤖 Auto (Smart)" : mode === "Leveling" ? "⚔️ Leveling" : "🔨 Professions"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  {getCharacterActivityModeDescription(char.activityMode)}
                </p>
              </div>

              <div className="space-y-4">
                {char.professions.map((prof, idx) => (
                  <div key={idx} className="bg-gray-800 p-3 rounded border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={prof.name}
                          onChange={(e) => onProfChange(char.id, idx, e.target.value)}
                          className="bg-gray-900 text-white text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-yellow-500"
                        >
                          {PROFESSIONS_LIST.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        {prof.skill >= hardCap && (
                          <span className="text-[10px] text-yellow-500 font-bold border border-yellow-900 px-1 rounded bg-yellow-900/20">
                            CAPPED
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-mono text-yellow-500">
                        {prof.skill} / {hardCap}
                      </span>
                    </div>
                    <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-600">
                      <div
                        className="bg-yellow-600 h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (prof.skill / hardCap) * 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>
                        Current Cap: {hardCap} (Lvl {getNextTierLevel(char.level)})
                      </span>
                      <span>Max: 300</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "personality" && (
            <div className="space-y-4">
              <div className="rounded border border-cyan-900/60 bg-cyan-950/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-100">
                      Morale
                    </h3>
                    <p className="mt-1 text-xs text-cyan-100/75">
                      {moraleEffectText}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{morale}/100</div>
                    <div className="text-xs font-semibold text-cyan-200">{moraleLabel}</div>
                  </div>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full border border-cyan-900/60 bg-gray-900">
                  <div
                    className={`h-full ${
                      morale <= 25
                        ? "bg-red-500"
                        : morale >= 75
                          ? "bg-emerald-500"
                          : "bg-cyan-500"
                    }`}
                    style={{ width: `${morale}%` }}
                  ></div>
                </div>
              </div>

              <div className="rounded border border-purple-900/60 bg-purple-950/15 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-purple-100">
                  {zoneArchetypeLabel}
                </h3>
                <p className="mt-1 text-xs text-purple-100/75">
                  {zoneArchetypeDescription}
                </p>
              </div>

              <div className="rounded border border-amber-900/60 bg-amber-950/15 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-amber-100">
                  Trait
                </h3>
                {personalityTraits.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-100/70">
                    No notable modifier.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {personalityTraits.map((trait) => (
                      <div key={trait.id}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-white">
                            {trait.name}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-300">
                            {trait.rarity}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-amber-100/75">
                          {trait.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded border border-gray-700 bg-gray-800/60 p-3">
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    Likes Biomes
                  </h4>
                  <PreferencePills values={zonePreference.likedBiomes} />
                </div>
                <div className="rounded border border-gray-700 bg-gray-800/60 p-3">
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-300">
                    Avoids Biomes
                  </h4>
                  <PreferencePills values={zonePreference.dislikedBiomes} tone="red" />
                </div>
                <div className="rounded border border-gray-700 bg-gray-800/60 p-3">
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    Likes Enemies
                  </h4>
                  <PreferencePills values={zonePreference.likedEnemies} />
                </div>
                <div className="rounded border border-gray-700 bg-gray-800/60 p-3">
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-300">
                    Avoids Enemies
                  </h4>
                  <PreferencePills values={zonePreference.dislikedEnemies} tone="red" />
                </div>
              </div>

              <div className="rounded border border-gray-700 bg-gray-900/40 p-3 text-xs text-gray-400">
                These traits are derived from the character identity and guide automatic
                zone finishing at max level.
              </div>

              <div className="rounded border border-pink-900/60 bg-pink-950/10">
                <button
                  type="button"
                  onClick={() => setRelationshipsOpen((prev) => !prev)}
                  aria-expanded={relationshipsOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-bold uppercase tracking-wide text-pink-100">
                    Relationships
                  </span>
                  <span className="flex items-center gap-2 text-[11px] text-pink-100/60">
                    {relationshipRows.length} known
                    <span className="flex h-6 w-6 items-center justify-center rounded border border-pink-900/60 bg-gray-950 text-sm text-pink-100">
                      {relationshipsOpen ? "-" : "+"}
                    </span>
                  </span>
                </button>
                {relationshipsOpen && (
                  <div className="border-t border-pink-950/60 px-4 pb-4 pt-3">
                    {relationshipRows.length === 0 ? (
                      <div className="text-xs text-gray-500 italic">
                        No known guildmates yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {relationshipRows.map((row) => {
                          const flairs =
                            row.flairs.length > 0
                              ? row.flairs
                              : ["No flair yet"];
                          const relationshipKey = row.relationship.memberIds.join("::");
                          const relationshipEvents = Array.isArray(
                            row.relationship.events,
                          )
                            ? row.relationship.events
                            : [];
                          const historyOpen =
                            relationshipHistoryOpenByKey[relationshipKey] === true;
                          return (
                            <div
                              key={`${char.id}-relationship-${row.otherMember.id}`}
                              className="rounded border border-gray-700 bg-gray-900/50 p-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 font-bold text-gray-100">
                                    <span>
                                      {getRoleIcon(row.otherMember.role)}
                                    </span>
                                    <span className="truncate">
                                      {row.otherMember.name}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-gray-400">
                                    Lvl {row.otherMember.level}{" "}
                                    {row.otherMember.charClass}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-pink-200">
                                    {row.level}
                                  </div>
                                  <div className="text-[11px] text-gray-400">
                                    {row.relationship.points} pts
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {flairs.map((flair) => (
                                  <span
                                    key={`${row.otherMember.id}-${flair}`}
                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                      flair === "No flair yet"
                                        ? "border-gray-700 bg-gray-900/60 text-gray-500"
                                        : "border-pink-800 bg-pink-950/35 text-pink-100"
                                    }`}
                                  >
                                    {flair}
                                  </span>
                                ))}
                              </div>
                              {row.relationship.lastMissionName && (
                                <div className="mt-1 text-[11px] text-gray-500">
                                  Last shared: {row.relationship.lastMissionName}
                                </div>
                              )}
                              <div className="mt-2 rounded border border-gray-800 bg-gray-950/45">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRelationshipHistoryOpenByKey((prev) => ({
                                      ...prev,
                                      [relationshipKey]: !prev[relationshipKey],
                                    }))
                                  }
                                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-300"
                                  aria-expanded={historyOpen}
                                >
                                  <span>Shared History</span>
                                  <span className="flex items-center gap-2 text-gray-500">
                                    {relationshipEvents.length} events
                                    <span className="text-sm text-pink-100">
                                      {historyOpen ? "-" : "+"}
                                    </span>
                                  </span>
                                </button>
                                {historyOpen && (
                                  <div className="space-y-1 border-t border-gray-800 px-2 py-2">
                                    {relationshipEvents.length === 0 ? (
                                      <div className="text-[11px] italic text-gray-500">
                                        No shared history recorded yet.
                                      </div>
                                    ) : (
                                      relationshipEvents.map((event, index) => {
                                        const pointsDelta =
                                          Number(event.pointsDelta) || 0;
                                        const pointsText =
                                          pointsDelta > 0
                                            ? `+${pointsDelta}`
                                            : String(pointsDelta);
                                        const outcome = event.missionSucceeded
                                          ? "success"
                                          : "failed";
                                        const eventDate =
                                          formatRelationshipEventDate(
                                            event.occurredAt,
                                          );
                                        return (
                                          <div
                                            key={`${relationshipKey}-event-${event.occurredAt}-${index}`}
                                            className="rounded bg-gray-900/70 px-2 py-1.5 text-[11px] text-gray-300"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="font-semibold text-gray-100">
                                                {event.missionName ||
                                                  formatRelationshipActivity(
                                                    event.activityType,
                                                  )}
                                              </span>
                                              <span
                                                className={
                                                  pointsDelta >= 0
                                                    ? "font-bold text-emerald-300"
                                                    : "font-bold text-red-300"
                                                }
                                              >
                                                {pointsText} Relationship
                                              </span>
                                            </div>
                                            <div className="mt-0.5 text-gray-500">
                                              {formatRelationshipActivity(
                                                event.activityType,
                                              )}{" "}
                                              [{outcome}]
                                              {eventDate ? ` - ${eventDate}` : ""}
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "zones" && (
            <div className="space-y-4">
              <div className="rounded border border-emerald-900/60 bg-emerald-950/10 px-3 py-2 text-xs text-emerald-100">
                {currentZone ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">Current Zone</span>
                      <span className="text-emerald-200">
                        {currentZone.name} ({Math.floor(currentZoneProgress)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-gray-800 border border-emerald-900/50">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.floor(currentZoneProgress)}%` }}
                      ></div>
                    </div>
                    <div className="text-[11px] text-emerald-200/80">
                      Recommended: Lvl {currentZone.minLevel}-{currentZone.maxLevel}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-300">No active zone assigned.</div>
                )}
              </div>

              {zoneRows.length === 0 ? (
                <div className="text-xs text-gray-500 italic">
                  No zone progress tracked yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {zoneRows.map((zone) => {
                    const progress = Math.max(
                      0,
                      Math.min(100, Number(zoneProgressById[zone.id] || 0)),
                    );
                    const isCleared = zonesClearedSet.has(zone.id);
                    const isCurrent = zone.id === currentZone?.id;
                    return (
                      <div
                        key={`${char.id}-zone-${zone.id}`}
                        className={`rounded border p-2 ${
                          isCurrent
                            ? "border-emerald-700 bg-emerald-950/20"
                            : isCleared
                              ? "border-yellow-700 bg-yellow-950/20"
                              : "border-gray-700 bg-gray-900/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-100">{zone.name}</span>
                          <span className="text-[11px] text-gray-300">
                            Lvl {zone.minLevel}-{zone.maxLevel}
                          </span>
                        </div>
                        <div className="mt-1 w-full h-1.5 rounded-full overflow-hidden bg-gray-800 border border-gray-700">
                          <div
                            className={`h-full ${isCleared ? "bg-yellow-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.floor(progress)}%` }}
                          ></div>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-400">
                          {isCurrent
                            ? `In progress: ${Math.floor(progress)}%`
                            : isCleared
                              ? "Cleared"
                              : `${Math.floor(progress)}% explored`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "achievements" && (
            <div className="space-y-4">
              <div className="rounded border border-amber-900/60 bg-amber-950/10 px-3 py-2 text-xs text-amber-100 flex items-center justify-between">
                <span>Total Clears</span>
                <span>
                  {clearedAchievementCount}/{uniqueAchievementMissions.length}
                </span>
              </div>
              {uniqueAchievementMissions.length === 0 ? (
                <div className="text-xs text-gray-500 italic">
                  No dungeons or raids available in the mission database.
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    {
                      key: "dungeons",
                      title: "Dungeon Clears",
                      missions: dungeonAchievementMissions,
                      clearedCount: clearedDungeonAchievementCount,
                      titleClass: "text-blue-200",
                    },
                    {
                      key: "raids",
                      title: "Raid Clears",
                      missions: raidAchievementMissions,
                      clearedCount: clearedRaidAchievementCount,
                      titleClass: "text-orange-200",
                    },
                  ].map((section) => (
                    <div
                      key={`${char.id}-achievement-section-${section.key}`}
                      className="rounded border border-gray-700 bg-gray-900/30 p-2"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wide ${section.titleClass}`}>
                          {section.title}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {section.clearedCount}/{section.missions.length}
                        </span>
                      </div>
                      {section.missions.length === 0 ? (
                        <div className="text-[11px] text-gray-500 italic">
                          No {section.key} available yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {section.missions.map((mission) => {
                            const missionIdKey = String(mission.id);
                            const isCleared = clearedMissionIdSet.has(missionIdKey);
                            return (
                              <div
                                key={`${char.id}-achievement-${missionIdKey}`}
                                className={`rounded border p-2 ${
                                  isCleared
                                    ? "border-yellow-700 bg-yellow-950/25"
                                    : "border-gray-700 bg-gray-900/40"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={getWowIconUrl(
                                        isCleared
                                          ? "inv_misc_head_dragon_01"
                                          : "achievement_bg_returnxflags_def_wsg",
                                      )}
                                      alt={isCleared ? "Cleared achievement" : "Not cleared"}
                                      className="w-4 h-4 rounded-sm border border-gray-700 object-cover flex-none"
                                      onError={(event) => {
                                        event.currentTarget.src = getWowIconUrl(
                                          "inv_misc_head_dragon_01",
                                        );
                                      }}
                                    />
                                    <span
                                      className={`text-xs font-semibold truncate ${
                                        isCleared ? "text-yellow-200" : "text-gray-400"
                                      }`}
                                    >
                                      {mission.label}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] uppercase tracking-wide whitespace-nowrap ${
                                      mission.isRaid ? "text-orange-300" : "text-blue-300"
                                    }`}
                                  >
                                    {mission.isRaid ? "Raid" : "Dungeon"}
                                  </span>
                                </div>
                                <div
                                  className={`mt-1 text-[11px] ${
                                    isCleared ? "text-yellow-300" : "text-gray-500"
                                  }`}
                                >
                                  {isCleared ? `🏅 Cleared ${mission.label}` : "Not cleared yet"}
                                  {mission.recommended ? ` • Recommended: Lvl ${mission.recommended}` : ""}
                                  {mission.minLevel ? ` • Min Join: Lvl ${mission.minLevel}` : ""}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
    </BaseModal>
  );
};

export default DetailModal;
