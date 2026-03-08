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
  getNextTierLevel,
  getQualityColor,
  getRacePortraitUrl,
  getReqExp,
  getRoleIcon,
  getSkillCap,
  getWowIconUrl,
} from "../../utils";
import { ZONE_DEFINITIONS, getZoneById } from "../../zones/zoneDefinitions";
import BaseModal from "./BaseModal";

const ItemSlot = ({ slotName, item }) => {
  const borderColor = item ? getQualityColor(item.quality) : "#444";
  const itemStats = formatItemStats(item?.stats);
  const itemLevel = getItemEffectiveLevel(item);

  return (
    <div className="flex items-center gap-3 bg-gray-800/50 p-2 rounded border border-gray-700 hover:bg-gray-700/50 transition-colors wow-card">
      <div
        className="w-10 h-10 flex-none rounded border flex items-center justify-center text-lg bg-black/40"
        style={{ borderColor }}
      >
        <img
          src={getItemIconUrl(item, slotName)}
          alt={item ? item.name : slotName}
          className="w-9 h-9 rounded-sm object-cover"
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">{slotName}</div>
        <div
          className={`text-sm font-bold truncate ${!item ? "text-gray-600 italic" : ""}`}
          style={{ color: item ? borderColor : undefined }}
        >
          {item ? item.name : "Empty"}
        </div>
        <div className="text-[10px] text-amber-200/70">iLvl {itemLevel}</div>
        {itemStats && <div className="text-[10px] text-gray-400 truncate">{itemStats}</div>}
      </div>
    </div>
  );
};

const DetailModal = ({
  char,
  isOpen,
  missionAchievementCatalog = [],
  onClose,
  onDismiss,
  onLevelChange,
  onRoleChange,
  onProfChange,
  onModeChange,
}) => {
  const [tab, setTab] = useState("stats");
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 8;
  const classData = DB_CLASSES[char?.charClass];

  const hardCap = getSkillCap(char?.level || 1);
  const averageItemLevel = getCharacterAverageItemLevel(char);
  const characterPower = getCharacterPowerScore(char);
  const setBonus = getCharacterSetBonus(char);
  const activeSetBonuses = getEquipmentSetBonuses(char?.equipment);
  const historyEntries = Array.isArray(char?.history) ? char.history : [];
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
    if (isOpen && char) {
      setHistoryPage(0);
    }
  }, [isOpen, char?.id]);

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

        <div className="flex border-b border-gray-700 bg-gray-800">
          <button
            onClick={() => setTab("stats")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "stats" ? "text-white border-b-2 border-blue-500 bg-gray-700" : "text-gray-500"}`}
          >
            Stats & Gear
          </button>
          <button
            onClick={() => setTab("profs")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "profs" ? "text-white border-b-2 border-yellow-500 bg-gray-700" : "text-gray-500"}`}
          >
            Professions
          </button>
          <button
            onClick={() => setTab("zones")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "zones" ? "text-white border-b-2 border-emerald-500 bg-gray-700" : "text-gray-500"}`}
          >
            Zones
          </button>
          <button
            onClick={() => setTab("achievements")}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gray-700 ${tab === "achievements" ? "text-white border-b-2 border-amber-500 bg-gray-700" : "text-gray-500"}`}
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.keys(char.equipment).map((slot) => (
                  <ItemSlot key={slot} slotName={slot} item={char.equipment[slot]} />
                ))}
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
                  {char.activityMode === "Leveling" && "Focuses purely on gaining XP."}
                  {char.activityMode === "Professions" && "Pauses XP gain to level up skills."}
                  {char.activityMode === "Auto" &&
                    "Prioritizes leveling, but pauses every 5 levels to hit staged skill targets (25 to 275), then 300 at level 60."}
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
                                          ? "achievement_general_raid_10man"
                                          : "achievement_bg_returnxflags_def_wsg",
                                      )}
                                      alt={isCleared ? "Cleared achievement" : "Not cleared"}
                                      className="w-4 h-4 rounded-sm border border-gray-700 object-cover flex-none"
                                      onError={(event) => {
                                        event.currentTarget.src = getWowIconUrl(
                                          "inv_misc_questionmark",
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
