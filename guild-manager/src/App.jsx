import React, { useState, useEffect, useRef } from "react";
import {
  CONFIG,
  INITIAL_MISSIONS,
  DB_CLASSES,
  PROF_ACTIONS,
  DB_ITEMS,
} from "./constants";
import {
  getReqExp,
  generateCharacter,
  getQualityClass,
  getQualityLabel,
  getSkillCap,
  getAutoSkillTarget,
  getNextTierLevel,
  getRoleIcon,
  getRacePortraitUrl,
  getWowIconUrl,
  createId,
  getClassArmorTypes,
} from "./utils";
import CharacterCard from "./components/CharacterCard";
import DetailModal from "./components/modals/DetailModal";
import LootTableModal from "./components/modals/LootTableModal";
import GuildLogModal from "./components/modals/GuildLogModal";
import DebugModal from "./components/modals/DebugModal";
import WorldMapModal from "./components/modals/WorldMapModal";
import BaseModal from "./components/modals/BaseModal";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const callGemini = async (prompt, isJson = false) => {
  try {
    if (!apiKey) {
      throw new Error("Missing VITE_GEMINI_API_KEY");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    if (isJson)
      body.generationConfig = { responseMimeType: "application/json" };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0)
      throw new Error("No candidates returned");
    const text = data.candidates[0].content.parts[0].text;
    return isJson ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini Call Failed:", error);
    throw error;
  }
};

const SESSION_FORMAT = "guild-manager-session";
const SESSION_VERSION = 1;

// --- Loot Logic (Dependencies on DB_ITEMS/DB_CLASSES) ---
const resolveMissionRewardQualities = (mission) => {
  if (Array.isArray(mission.rewardQualities) && mission.rewardQualities.length) {
    return mission.rewardQualities;
  }
  if (mission.type === "dungeon") return [2, 3];
  if (mission.elite) return [2];
  return [1];
};

const generatePersonalLoot = (mission, char) => {
  const isDungeon = mission.type === "dungeon";
  const dropChance = isDungeon ? 1.0 : 0.5;
  if (Math.random() > dropChance) return null;

  const classInfo = DB_CLASSES[char.charClass];
  if (!classInfo) return null;

  const profs = getClassArmorTypes(char.charClass);
  const rewardQualities = resolveMissionRewardQualities(mission);
  const targetQuality = isDungeon ? 2 : Math.max(...rewardQualities);
  const missionDungeon = isDungeon ? mission.name : null;
  const maxItemLevel = isDungeon
    ? char.level + 2
    : Math.min(char.level + 2, mission.level);
  const minItemLevel = Math.max(1, mission.level - 5);

  const possibleItems = DB_ITEMS.filter((item) => {
    const isDungeonItem = typeof item.dungeon === "string";
    if (!isDungeon && isDungeonItem) return false;
    if (isDungeon && isDungeonItem && item.dungeon !== missionDungeon) return false;

    const levelOK =
      item.minLevel <= maxItemLevel && item.minLevel >= minItemLevel;
    const typeOK = item.type === "Generic" || profs.includes(item.type);
    const qualityOK = item.quality === targetQuality;
    return levelOK && typeOK && qualityOK;
  });

  if (possibleItems.length === 0) return null;

  if (isDungeon) {
    const missionSpecificItems = possibleItems.filter(
      (item) => item.dungeon === missionDungeon,
    );
    const pool = missionSpecificItems.length > 0 ? missionSpecificItems : possibleItems;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return possibleItems[Math.floor(Math.random() * possibleItems.length)];
};

const generateBossLoot = (mission, partyMembers) => {
  if (mission.type !== "dungeon") return null;
  if (Math.random() > 0.2) return null;
  const missionDungeon = mission.name;
  const blueItems = DB_ITEMS.filter((i) => {
    if (i.quality !== 3) return false;
    if (!i.dungeon) return true;
    return i.dungeon === missionDungeon;
  });
  if (blueItems.length === 0) return null;
  const missionSpecificBlues = blueItems.filter(
    (item) => item.dungeon === missionDungeon,
  );
  const bluePool =
    missionSpecificBlues.length > 0 ? missionSpecificBlues : blueItems;
  const loot = bluePool[Math.floor(Math.random() * bluePool.length)];

  const eligible = partyMembers.filter((c) => {
    const info = DB_CLASSES[c.charClass];
    if (!info) return false;
    const profs = getClassArmorTypes(c.charClass);
    return loot.type === "Generic" || profs.includes(loot.type);
  });

  if (eligible.length === 0) return null;
  const winner = eligible[Math.floor(Math.random() * eligible.length)];
  return { loot, winnerId: winner.id };
};

const getMissionGoldReward = (mission) => {
  return typeof mission.gold === "number" ? Math.max(0, mission.gold) : 0;
};

const getMissionTypeLabel = (mission) =>
  mission.typeLabel ||
  (mission.type === "dungeon"
    ? "Dungeon"
    : mission.elite
      ? "Elite Quest"
      : "Quest");

const getMissionRewardQualities = (mission) => {
  return resolveMissionRewardQualities(mission);
};

const getMissionMetaText = (mission) =>
  `${getMissionTypeLabel(mission)} • Lvl ${mission.recommended || mission.level} • ${mission.duration}s`;

// --- Local Components ---

const RecruitModal = ({ isOpen, onClose, onRecruit, availableSlots }) => {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [limitWarning, setLimitWarning] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setCandidates([]);
      setSelectedIds([]);
      setLimitWarning(false);
      const timer = setTimeout(() => {
        setCandidates([
          generateCharacter(),
          generateCharacter(),
          generateCharacter(),
        ]);
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const toggleCandidate = (candidateId) => {
    setSelectedIds((prev) => {
      if (prev.includes(candidateId)) {
        setLimitWarning(false);
        return prev.filter((id) => id !== candidateId);
      }

      if (availableSlots <= 0 || prev.length >= availableSlots) {
        setLimitWarning(true);
        return prev;
      }

      setLimitWarning(false);
      return [...prev, candidateId];
    });
  };

  const handleRecruitSelected = () => {
    const selectedCandidates = candidates.filter((char) =>
      selectedIds.includes(char.id),
    );
    if (selectedCandidates.length === 0) return;
    onRecruit(selectedCandidates);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-yellow-700 rounded-none md:rounded-lg w-full max-w-3xl h-full md:h-auto overflow-y-auto relative"
    >
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-gray-500 hover:text-white text-3xl z-10"
        >
          &times;
        </button>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 animate-bounce">🔍</div>
              <h2 className="text-2xl fantasy-font text-yellow-500">
                Scouting...
              </h2>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl text-center mb-6 fantasy-font mt-8 md:mt-0">
                Applicants Found
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {candidates.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => toggleCandidate(char.id)}
                    className={`bg-gray-800 p-4 rounded flex flex-col items-center text-center cursor-pointer border hover:bg-gray-700 transition-all active:scale-95 ${selectedIds.includes(char.id) ? "border-green-500 bg-green-900/20" : "border-transparent hover:border-yellow-500"}`}
                  >
                    <img
                      src={getRacePortraitUrl(char.race, char.gender)}
                      alt={`${char.race} ${char.gender}`}
                      className="w-16 h-16 mb-2 rounded border border-gray-600 object-cover"
                      onError={(event) => {
                        event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                      }}
                    />
                    <div
                      className="font-bold text-lg inline-flex items-center gap-1"
                      style={{
                        color: DB_CLASSES[char.charClass]
                          ? DB_CLASSES[char.charClass].color
                          : "#fff",
                      }}
                    >
                      <span>{char.name}</span>
                      <span className="text-sm text-gray-400">
                        {char.gender === "Male" ? "♂️" : "♀️"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mb-2 inline-flex items-center gap-1">
                      <span>{char.race}</span>
                      {DB_CLASSES[char.charClass]?.icon && (
                        <img
                          src={DB_CLASSES[char.charClass].icon}
                          alt={char.charClass}
                          className="w-4 h-4 rounded-sm border border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <span>{char.charClass}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                      Role: <span className="text-white">{char.role}</span>{" "}
                      {getRoleIcon(char.role)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCandidate(char.id);
                      }}
                      className={`mt-auto px-4 py-2 border rounded text-xs uppercase tracking-wider w-full md:w-auto ${selectedIds.includes(char.id) ? "text-green-200 border-green-500 bg-green-900/40" : "text-green-400 border-gray-600 hover:bg-green-900"}`}
                    >
                      {selectedIds.includes(char.id) ? "Selected" : "Select"}
                    </button>
                  </div>
                ))}
              </div>
              <div className="text-center flex flex-col items-center justify-center gap-2">
                {availableSlots <= 0 ? (
                  <div className="text-xs text-red-400 border border-red-900/60 bg-red-950/30 px-3 py-1 rounded">
                    Member limit reached. Dismiss heroes to recruit more.
                  </div>
                ) : limitWarning ? (
                  <div className="text-xs text-yellow-300 border border-yellow-900/60 bg-yellow-950/30 px-3 py-1 rounded">
                    You reached your member limit for this recruit. Max selectable:{" "}
                    {availableSlots}.
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    Open slots: {availableSlots}
                  </div>
                )}
                <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleRecruitSelected}
                  disabled={selectedIds.length === 0 || availableSlots <= 0}
                  className="px-4 py-2 border border-green-700 rounded text-xs uppercase tracking-wider text-green-300 hover:bg-green-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Recruit Selected ({selectedIds.length})
                </button>
                <button
                  onClick={onClose}
                  className="text-red-400 text-sm hover:text-white border-b border-red-900 p-2"
                >
                  Reject All
                </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </BaseModal>
  );
};

const MissionModal = ({
  isOpen,
  onClose,
  roster,
  onDeploy,
  missionList,
}) => {
  const [view, setView] = useState("list");
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [party, setParty] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (isOpen) {
      setView("list");
      setParty([]);
      setSelectedQuest(null);
      setSelectedCategory("all");
    }
  }, [isOpen]);

  const handleSelectQuest = (q) => {
    setSelectedQuest(q);
    setView("prep");
    setParty([]);
  };
  const toggleMember = (charId) => {
    if (party.includes(charId)) setParty(party.filter((id) => id !== charId));
    else if (party.length < 5) setParty([...party, charId]);
  };
  const minLevel = selectedQuest
    ? selectedQuest.minLevel || Math.max(1, selectedQuest.level - 6)
    : 1;
  const idleRoster = roster.filter(
    (c) =>
      c.status === "Idle" ||
      c.status.includes("Mining") ||
      c.status.includes("Herbs") ||
      c.status.includes("Skinning") ||
      c.status.includes("Forging") ||
      c.status.includes("Stitching") ||
      c.status.includes("Weaving") ||
      c.status.includes("Disenchanting") ||
      c.status.includes("Brewing"),
  );
  const orderedMissions = [...missionList].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });
  const getMissionCategory = (mission) => {
    if (mission.type === "dungeon") return "dungeon";
    return mission.elite ? "elite" : "quest";
  };
  const categoryLabels = {
    all: "All",
    quest: "Quests",
    elite: "Elite Quests",
    dungeon: "Dungeons",
  };
  const categoryFilterOptions = ["all", "quest", "elite", "dungeon"];
  const missionSections =
    selectedCategory === "all"
      ? [
          {
            key: "quest",
            title: "Quests",
            icon: "📜",
            missions: orderedMissions.filter(
              (mission) => getMissionCategory(mission) === "quest",
            ),
          },
          {
            key: "elite",
            title: "Elite Quests",
            icon: "⚔️",
            missions: orderedMissions.filter(
              (mission) => getMissionCategory(mission) === "elite",
            ),
          },
          {
            key: "dungeon",
            title: "Dungeons",
            icon: "🏰",
            missions: orderedMissions.filter(
              (mission) => getMissionCategory(mission) === "dungeon",
            ),
          },
        ].filter((section) => section.missions.length > 0)
      : [
          {
            key: selectedCategory,
            title: categoryLabels[selectedCategory],
            icon:
              selectedCategory === "dungeon"
                ? "🏰"
                : selectedCategory === "elite"
                  ? "⚔️"
                  : "📜",
            missions: orderedMissions.filter(
              (mission) => getMissionCategory(mission) === selectedCategory,
            ),
          },
        ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-blue-900 rounded-none md:rounded-lg w-full max-w-4xl h-full md:h-[80vh] flex flex-col relative shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center flex-none">
          <h2 className="text-xl md:text-2xl fantasy-font text-blue-400">
            {view === "list" ? "Mission Board" : "Tactical Map"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-3xl px-2"
          >
            &times;
          </button>
        </div>
        {view === "list" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-3 pb-2 border-b border-gray-700 bg-gray-900/80">
              <div className="flex items-center gap-2 flex-wrap">
                {categoryFilterOptions.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-xs rounded border transition-colors ${selectedCategory === category ? "border-blue-500 bg-blue-900/40 text-blue-200" : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                  >
                    {categoryLabels[category]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {missionSections.length === 0 ? (
                <div className="text-center text-gray-500 italic py-10">
                  No missions in this category.
                </div>
              ) : (
                <div className="space-y-5">
                  {missionSections.map((section) => (
                    <section key={section.key} className="space-y-2">
                      <div className="px-1 flex items-center justify-between">
                        <h3 className="text-xs md:text-sm uppercase tracking-wider text-gray-300 font-bold">
                          {section.icon} {section.title}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {section.missions.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {section.missions.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => handleSelectQuest(m)}
                            className={`p-4 rounded cursor-pointer flex justify-between items-center bg-gray-800 active:bg-gray-700 hover:translate-x-1 transition-transform border border-transparent hover:border-blue-500 ${m.type === "dungeon" ? "border-l-4 border-l-blue-600" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-2xl bg-gray-900 w-10 h-10 flex items-center justify-center rounded border border-gray-700">
                                {m.type === "dungeon"
                                  ? "🏰"
                                  : m.elite
                                    ? "⚔️"
                                    : "📜"}
                              </div>
                              <div>
                                <div
                                  className={`font-bold text-lg ${m.elite ? "text-yellow-500" : "text-gray-200"}`}
                                >
                                  {m.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {getMissionMetaText(m)}
                                </div>
                                <div className="text-xs text-yellow-400 mt-1">
                                  Rewards:{" "}
                                  {typeof m.gold === "number"
                                    ? m.gold
                                    : getMissionGoldReward(m)}
                                  g • {m.exp} XP
                                  {" • "}
                                  Loot:{" "}
                                  {getMissionRewardQualities(m).map(
                                    (quality, idx, arr) => (
                                      <React.Fragment
                                        key={`${m.id}-${quality}-${idx}`}
                                      >
                                        <span className={getQualityClass(quality)}>
                                          [{getQualityLabel(quality)}]
                                        </span>
                                        {idx < arr.length - 1 && (
                                          <span className="text-gray-500"> + </span>
                                        )}
                                      </React.Fragment>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {view === "prep" && selectedQuest && (
          <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
            <div className="bg-gray-900 p-4 md:p-6 border-b border-gray-700 flex-none shadow-md">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2
                    className={`text-xl md:text-2xl fantasy-font ${selectedQuest.elite ? "text-yellow-500" : "text-white"}`}
                  >
                    {selectedQuest.name}
                  </h2>
                  <div className="text-xs text-gray-400 mt-1">
                    {getMissionMetaText(selectedQuest)}
                  </div>
                  <p className="text-xs text-amber-100/80 mt-2 max-w-2xl leading-relaxed">
                    {selectedQuest.type === "dungeon"
                      ? "Dungeon briefing: prepare a full squad and expect extended combat with stronger loot opportunities."
                      : selectedQuest.elite
                        ? "Elite briefing: high-risk target with dangerous resistance. Bring appropriate levels and roles."
                        : "Quest briefing: a standard operation suited for steady progression and resource gains."}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                    <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                      Recommended: Lvl {selectedQuest.recommended || selectedQuest.level}
                    </span>
                    <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-gray-300">
                      Minimum to Join: Lvl {minLevel}
                    </span>
                    <span className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-yellow-300">
                      Rewards:{" "}
                      {typeof selectedQuest.gold === "number"
                        ? selectedQuest.gold
                        : getMissionGoldReward(selectedQuest)}
                      g • {selectedQuest.exp} XP •{" "}
                      {getMissionRewardQualities(selectedQuest).map(
                        (quality, idx, arr) => (
                          <React.Fragment
                            key={`${selectedQuest.id}-prep-${quality}-${idx}`}
                          >
                            <span className={getQualityClass(quality)}>
                              [{getQualityLabel(quality)}]
                            </span>
                            {idx < arr.length - 1 && (
                              <span className="text-gray-500"> + </span>
                            )}
                          </React.Fragment>
                        ),
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div className="text-xs md:text-sm text-gray-400 mb-1">
                    Squad
                  </div>
                  <div className="text-xl font-bold text-white">
                    {party.length}/5
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 custom-scrollbar">
              {idleRoster.map((char) => {
                const isEligible = char.level >= minLevel;
                const isSelected = party.includes(char.id);
                return (
                  <div
                    key={char.id}
                    onClick={() => isEligible && toggleMember(char.id)}
                    className={`p-3 rounded flex items-center gap-3 transition-all cursor-pointer border ${!isEligible ? "opacity-40 cursor-not-allowed bg-black border-transparent" : isSelected ? "bg-green-900/30 border-green-500" : "bg-gray-700 border-gray-600 hover:bg-gray-600"}`}
                  >
                    <img
                      src={getRacePortraitUrl(char.race, char.gender)}
                      alt={`${char.race} ${char.gender}`}
                      className="w-10 h-10 rounded border border-gray-600 object-cover bg-gray-900"
                      onError={(event) => {
                        event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                      }}
                    />
                    <div className="flex-1">
                      <div
                        className="font-bold text-sm"
                        style={{ color: DB_CLASSES[char.charClass].color }}
                      >
                        {char.name}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-400">
                          {getRoleIcon(char.role)} Lvl {char.level}
                        </span>
                        {!isEligible && (
                          <span className="text-[10px] text-red-500 font-bold uppercase">
                            LOW
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-between items-center flex-none">
              <button
                onClick={() => setView("list")}
                className="text-gray-400 hover:text-white text-sm md:text-base"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  onDeploy(selectedQuest, party);
                  onClose();
                }}
                disabled={party.length === 0}
                className="btn-quest px-6 md:px-10 py-3 rounded text-blue-100 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                Deploy
              </button>
            </div>
          </div>
        )}
    </BaseModal>
  );
};

const ActiveMissionCard = ({ mission, onFinish }) => {
  const now = Date.now();
  const timeLeft = Math.max(0, mission.finishTime - now);
  const progress = 100 - (timeLeft / mission.totalDuration) * 100;
  return (
    <div className="wow-card p-3 rounded flex flex-col gap-2 shadow-lg relative overflow-hidden border border-gray-600 bg-gray-800">
      <div className="flex justify-between items-center z-10 relative">
        <span className="font-bold text-sm text-white flex items-center gap-1">
          {mission.type === "dungeon" ? "🏰" : "📜"} {mission.name}
        </span>
        <span className="text-xs text-gray-400">
          {Math.ceil(timeLeft / 1000)}s
        </span>
      </div>
      <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden z-10 relative">
        <div
          className="bg-blue-500 h-full transition-all duration-100 linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <button
        onClick={() => onFinish(mission)}
        className="mt-1 text-[10px] uppercase font-bold tracking-wider bg-green-900/50 hover:bg-green-700 text-green-100 px-3 py-2 rounded border border-green-800 transition-colors shadow-sm active:scale-95"
      >
        ⚡ Instant Finish
      </button>
    </div>
  );
};

const OptionsModal = ({
  isOpen,
  onClose,
  onSaveSession,
  onLoadSession,
  onOpenDebug,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/70 backdrop-blur-sm p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-2 border-gray-700 rounded-lg w-full max-w-sm shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold fantasy-font text-gray-100">Options</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl px-1">
            &times;
          </button>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={() => {
              onSaveSession();
              onClose();
            }}
            className="w-full px-4 py-3 rounded border border-emerald-800 bg-gray-800 text-emerald-200 hover:bg-gray-700 text-sm font-bold"
          >
            💾 Save Session
          </button>
          <button
            onClick={() => {
              onLoadSession();
              onClose();
            }}
            className="w-full px-4 py-3 rounded border border-teal-800 bg-gray-800 text-teal-200 hover:bg-gray-700 text-sm font-bold"
          >
            📂 Load Session
          </button>
          <button
            onClick={() => {
              onOpenDebug();
              onClose();
            }}
            className="w-full px-4 py-3 rounded border border-red-900 bg-gray-900 text-red-300 hover:bg-red-900/20 text-sm font-bold"
          >
            ⚙️ Debug Menu
          </button>
        </div>
    </BaseModal>
  );
};

// --- MAIN APP COMPONENT ---

const App = () => {
  const [roster, setRoster] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]);
  const [missionList, setMissionList] = useState(INITIAL_MISSIONS);
  const [guildLog, setGuildLog] = useState([]);
  const [guildGold, setGuildGold] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showRecruit, setShowRecruit] = useState(false);
  const [showMissions, setShowMissions] = useState(false);
  const [showLootTable, setShowLootTable] = useState(false);
  const [showGuildLog, setShowGuildLog] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [detailCharId, setDetailCharId] = useState(null);

  const rosterRef = useRef(roster);
  const missionsRef = useRef(activeMissions);
  const goldRef = useRef(guildGold);
  const rewardedMissionIdsRef = useRef(new Set());
  const sessionFileInputRef = useRef(null);

  useEffect(() => {
    rosterRef.current = roster;
  }, [roster]);
  useEffect(() => {
    missionsRef.current = activeMissions;
  }, [activeMissions]);
  useEffect(() => {
    goldRef.current = guildGold;
  }, [guildGold]);

  const applyLevelAndProfessionDelta = (char, levelDelta) => {
    const newLevel = Math.min(
      CONFIG.LEVEL_CAP,
      Math.max(1, char.level + levelDelta),
    );
    const appliedLevelDelta = newLevel - char.level;
    const profDelta = appliedLevelDelta * 5;
    const newSkillCap = Math.min(300, getSkillCap(newLevel));

    const updatedProfessions = char.professions.map((prof) => {
      const shifted = prof.skill + profDelta;
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

  const getMissionInstanceId = (mission) =>
    mission.instanceId || `${mission.questId || mission.id}-${mission.startTime || 0}`;

  // Reusable Reward Logic
  const processMissionRewards = (mission, currentRoster) => {
    const dungeonBonusRoll = generateBossLoot(
      mission,
      currentRoster.filter((c) => mission.memberIds.includes(c.id)),
    );
    const missionGold =
      typeof mission.payoutGold === "number"
        ? Math.max(0, mission.payoutGold)
        : getMissionGoldReward(mission);
    let missionLogs = [];
    const updatedRoster = currentRoster.map((c) => {
      if (mission.memberIds.includes(c.id)) {
        let newExp = c.exp + mission.exp;
        let newLevel = c.level;
        let maxExp = getReqExp(newLevel);
        let leveledUp = false;
        while (newExp >= maxExp && newLevel < CONFIG.LEVEL_CAP) {
          newLevel++;
          newExp -= maxExp;
          maxExp = getReqExp(newLevel);
          leveledUp = true;
        }
        if (newLevel >= CONFIG.LEVEL_CAP) {
          newLevel = CONFIG.LEVEL_CAP;
          newExp = maxExp;
        }

        let newEquipment = { ...c.equipment };
        let historyEntry = {
          name: mission.name,
          type: mission.type,
          elite: !!mission.elite,
          exp: mission.exp,
          time: new Date().toLocaleTimeString(),
          loot: null,
        };

        let lootItem = null;
        if (dungeonBonusRoll && dungeonBonusRoll.winnerId === c.id) {
          lootItem = dungeonBonusRoll.loot;
        } else {
          lootItem = generatePersonalLoot(mission, c);
        }

        if (lootItem) {
          const currentItem = newEquipment[lootItem.slot];
          if (!currentItem || lootItem.quality > currentItem.quality) {
            newEquipment[lootItem.slot] = lootItem;
            historyEntry.loot = lootItem;
            missionLogs.push({
              type: "loot",
              characterName: c.name,
              itemName: lootItem.name,
              itemQuality: lootItem.quality,
              missionName: mission.name,
            });
          }
        }

        // IMPORTANT: Set Status back to Idle immediately!
        return {
          ...c,
          status: "Idle",
          statusText: "Returning from Mission...",
          level: newLevel,
          exp: newExp,
          maxExp,
          lastLevelUp: leveledUp ? Date.now() : c.lastLevelUp,
          history: [historyEntry, ...c.history],
          equipment: newEquipment,
        };
      }
      return c;
    });
    return { updatedRoster, missionLogs, missionGold };
  };

  // --- GAME LOOP ---
  useEffect(() => {
    const tick = setInterval(() => {
      if (isPaused) return;

      const now = Date.now();
      const currentRoster = rosterRef.current;
      const currentMissions = missionsRef.current;
      const currentGold = goldRef.current;

      let newRoster = [...currentRoster];
      let newMissions = [];
      let finishedMissions = [];
      let newLogs = [];
      let newGold = currentGold;

      // 1. Separate Missions
      currentMissions.forEach((m) => {
        if (m.finishTime <= now) finishedMissions.push(m);
        else newMissions.push(m);
      });

      // 2. Process Finished Missions (Fixes "Stuck" Issue)
      finishedMissions.forEach((m) => {
        const missionInstanceId = getMissionInstanceId(m);
        if (rewardedMissionIdsRef.current.has(missionInstanceId)) return;
        rewardedMissionIdsRef.current.add(missionInstanceId);

        const result = processMissionRewards(m, newRoster);
        newRoster = result.updatedRoster;
        newLogs = [...newLogs, ...result.missionLogs];

        const openGoldSpace = CONFIG.GOLD_CAP - newGold;
        const gainedGold = Math.max(
          0,
          Math.min(result.missionGold, openGoldSpace),
        );
        if (gainedGold > 0) {
          newGold += gainedGold;
          newLogs.push({
            type: "gold",
            amount: gainedGold,
            missionName: m.name,
          });
        }
      });

      // 3. Process Character Status (Idle/Professions)
      newRoster = newRoster.map((char) => {
        if (char.status === "Questing") return char;

        let statusText = "Resting...";
        let gainXP = false;
        let gainSkill = false;

        const hardCap = getSkillCap(char.level);
        const autoTarget = getAutoSkillTarget(char.level);
        const canGainSkill = char.professions.some((p) => p.skill < hardCap);
        const needsAutoSkill = char.professions.some(
          (p) => p.skill < autoTarget,
        );
        const isCheckpointLevel = char.level % 5 === 0;

        if (char.activityMode === "Leveling") {
          if (char.level < CONFIG.LEVEL_CAP) {
            gainXP = true;
            statusText = "⚔️ Grinding XP...";
          } else {
            statusText = "Max Level Reached";
          }
        } else if (char.activityMode === "Professions") {
          if (canGainSkill) {
            gainSkill = true;
          } else {
            statusText =
              "Skills Capped (Need Level " + getNextTierLevel(char.level) + ")";
          }
        } else if (char.activityMode === "Auto") {
          if (isCheckpointLevel && needsAutoSkill) {
            gainSkill = true;
            statusText = "🤖 Auto: Skilling to " + autoTarget + "...";
          } else if (char.level < CONFIG.LEVEL_CAP) {
            gainXP = true;
            statusText = "⚔️ Auto: Leveling...";
          } else if (canGainSkill && char.level >= CONFIG.LEVEL_CAP) {
            // At max level, just skill to hard cap
            gainSkill = true;
            statusText = "🤖 Auto: Max Level Skilling...";
          } else {
            statusText = "Awaiting Orders";
          }
        }

        if (gainXP) {
          const expGain = 20 + char.level * 4;
          let newExp = char.exp + expGain;
          let newLevel = char.level;
          let maxExp = getReqExp(newLevel);
          let leveledUp = false;
          while (newExp >= maxExp && newLevel < CONFIG.LEVEL_CAP) {
            newLevel++;
            newExp -= maxExp;
            maxExp = getReqExp(newLevel);
            leveledUp = true;
          }
          if (newLevel >= CONFIG.LEVEL_CAP) {
            newLevel = CONFIG.LEVEL_CAP;
            newExp = maxExp;
          }
          return {
            ...char,
            level: newLevel,
            exp: newExp,
            maxExp,
            statusText,
            lastLevelUp: leveledUp ? Date.now() : char.lastLevelUp,
          };
        }

        if (gainSkill) {
          // Determine cap based on mode
          const currentLimit =
            char.activityMode === "Auto" && isCheckpointLevel && needsAutoSkill
              ? autoTarget
              : hardCap;

          const uncappedProfs = char.professions.filter(
            (p) => p.skill < currentLimit && p.skill < 300,
          );

          if (uncappedProfs.length > 0) {
            const targetProfIndex = Math.floor(
              Math.random() * uncappedProfs.length,
            );
            const realIndex = char.professions.indexOf(
              uncappedProfs[targetProfIndex],
            );
            const pName = char.professions[realIndex].name;
            statusText = PROF_ACTIONS[pName] || `Working on ${pName}...`;

            if (Math.random() > 0.3) {
              const newProfs = [...char.professions];
              newProfs[realIndex] = {
                ...newProfs[realIndex],
                skill: newProfs[realIndex].skill + 1,
              };
              return { ...char, professions: newProfs, statusText };
            }
          }
        }

        return { ...char, statusText };
      });

      setRoster(newRoster);
      setActiveMissions(newMissions);
      if (newGold !== currentGold) {
        goldRef.current = newGold;
        setGuildGold(newGold);
      }

      if (newLogs.length > 0) {
        const time = new Date().toLocaleTimeString();
        setGuildLog((prev) =>
          [...newLogs.map((log) => ({ time, ...log })), ...prev].slice(0, 50),
        );
      }
    }, CONFIG.TICK_RATE);
    return () => clearInterval(tick);
  }, [isPaused]);

  const handleRecruit = (chars) => {
    setRoster((prev) => {
      if (prev.length >= CONFIG.MAX_ROSTER) return prev;
      const slotsLeft = CONFIG.MAX_ROSTER - prev.length;
      const recruits = chars.slice(0, slotsLeft);
      return [...prev, ...recruits];
    });
    setShowRecruit(false);
  };
  const handleDismiss = (id) => {
    setRoster((p) => p.filter((c) => c.id !== id));
    setDetailCharId(null);
  };
  const handleModeChange = (id, mode) => {
    setRoster((p) =>
      p.map((c) => (c.id !== id ? c : { ...c, activityMode: mode })),
    );
  };
  const handleProfChange = (id, idx, newProf) => {
    setRoster((p) =>
      p.map((c) => {
        if (c.id !== id) return c;
        const newProfs = [...c.professions];
        newProfs[idx] = { name: newProf, skill: 1 };
        return { ...c, professions: newProfs };
      }),
    );
  };
  const handleUpdateBackstory = (charId, story) => {
    setRoster((p) =>
      p.map((c) => (c.id !== charId ? c : { ...c, backstory: story })),
    );
  };
  const handleGenerateBackstory = async (char) => {
    try {
      const prompt = `Write a short, engaging 2-sentence fantasy backstory for a level ${char.level} ${char.race} ${char.charClass} named ${char.name}. They are a member of the 'Alliance Vanguard' guild.`;
      return await callGemini(prompt, false);
    } catch (error) {
      alert("Oracle is meditating. Add VITE_GEMINI_API_KEY and try again.");
      return null;
    }
  };
  const handleDeploy = (quest, ids) => {
    const startTime = Date.now();
    setRoster((prev) =>
      prev.map((c) =>
        ids.includes(c.id)
          ? { ...c, status: "Questing", statusText: "On Mission" }
          : c,
      ),
    );
    setActiveMissions((prev) => [
      ...prev,
      {
        ...quest,
        instanceId: createId(),
        payoutGold: getMissionGoldReward(quest),
        questId: quest.id,
        startTime,
        finishTime: startTime + quest.duration * 1000,
        totalDuration: quest.duration * 1000,
        memberIds: [...ids],
      },
    ]);
  };
  const handleManualFinish = (m) => {
    const missionInstanceId = getMissionInstanceId(m);
    if (rewardedMissionIdsRef.current.has(missionInstanceId)) return;
    rewardedMissionIdsRef.current.add(missionInstanceId);

    // Manually trigger the finish logic immediately (logic also exists in loop, but this is for instant feedback)
    // To avoid race conditions, we filter it out of activeMissions immediately
    setActiveMissions((prev) => prev.filter((mi) => mi !== m));
    setRoster((prevRoster) => {
      const result = processMissionRewards(m, prevRoster);
      const openGoldSpace = CONFIG.GOLD_CAP - goldRef.current;
      const gainedGold = Math.max(0, Math.min(result.missionGold, openGoldSpace));

      if (gainedGold > 0) {
        const updatedGold = goldRef.current + gainedGold;
        goldRef.current = updatedGold;
        setGuildGold(updatedGold);
      }

      if (result.missionLogs.length > 0 || gainedGold > 0) {
        const time = new Date().toLocaleTimeString();
        const extraLogs =
          gainedGold > 0
            ? [{ type: "gold", amount: gainedGold, missionName: m.name }]
            : [];
        setGuildLog((prev) =>
          [
            ...[...result.missionLogs, ...extraLogs].map((log) => ({
              time,
              ...log,
            })),
            ...prev,
          ].slice(0, 50),
        );
      }
      return result.updatedRoster;
    });
  };

  const handleLevelChange = (id, amt) => {
    setRoster((p) =>
      p.map((c) => (c.id !== id ? c : applyLevelAndProfessionDelta(c, amt))),
    );
  };

  const handleBulkLevel = (amt) => {
    setRoster((p) => p.map((c) => applyLevelAndProfessionDelta(c, amt)));
    setShowDebug(false);
  };

  const buildSessionPayload = () => {
    const now = Date.now();
    const serializedActiveMissions = activeMissions.map((mission) => {
      const remainingMs = Math.max(0, mission.finishTime - now);
      return {
        ...mission,
        remainingMs,
      };
    });

    return {
      format: SESSION_FORMAT,
      version: SESSION_VERSION,
      savedAt: new Date().toISOString(),
      data: {
        roster,
        activeMissions: serializedActiveMissions,
        missionList,
        guildLog,
        guildGold,
      },
    };
  };

  const handleSaveSession = () => {
    try {
      const payload = buildSessionPayload();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `guild-session-${timestamp}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to save session:", error);
      alert("Could not save session file.");
    }
  };

  const handleLoadButtonClick = () => {
    sessionFileInputRef.current?.click();
  };

  const handleLoadSessionFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || "{}"));
        const payloadData = raw && typeof raw === "object" ? raw.data || raw : {};

        const loadedRoster = Array.isArray(payloadData.roster)
          ? payloadData.roster
          : [];
        const loadedMissionList =
          Array.isArray(payloadData.missionList) &&
          payloadData.missionList.length > 0
            ? payloadData.missionList
            : INITIAL_MISSIONS;
        const loadedGuildLog = Array.isArray(payloadData.guildLog)
          ? payloadData.guildLog.slice(0, 50)
          : [];
        const loadedGuildGold =
          typeof payloadData.guildGold === "number"
            ? Math.max(0, Math.min(CONFIG.GOLD_CAP, payloadData.guildGold))
            : 0;

        const now = Date.now();
        const loadedActiveMissions = Array.isArray(payloadData.activeMissions)
          ? payloadData.activeMissions.map((mission) => {
              const remainingMs =
                typeof mission.remainingMs === "number"
                  ? Math.max(0, mission.remainingMs)
                  : Math.max(0, (mission.finishTime || now) - now);
              const totalDuration =
                typeof mission.totalDuration === "number" &&
                mission.totalDuration > 0
                  ? mission.totalDuration
                  : Math.max(1000, remainingMs);
              return {
                ...mission,
                instanceId: mission.instanceId || createId(),
                startTime: now,
                finishTime: now + remainingMs,
                totalDuration,
              };
            })
          : [];

        const activeMemberIds = new Set(
          loadedActiveMissions.flatMap((mission) =>
            Array.isArray(mission.memberIds) ? mission.memberIds : [],
          ),
        );
        const normalizedRoster = loadedRoster.map((char) => {
          if (activeMemberIds.has(char.id)) {
            return {
              ...char,
              status: "Questing",
              statusText: "On Mission",
            };
          }
          if (char.status === "Questing") {
            return {
              ...char,
              status: "Idle",
              statusText: "Awaiting Orders",
            };
          }
          return char;
        });

        rewardedMissionIdsRef.current = new Set();
        rosterRef.current = normalizedRoster;
        missionsRef.current = loadedActiveMissions;
        goldRef.current = loadedGuildGold;
        setRoster(normalizedRoster);
        setActiveMissions(loadedActiveMissions);
        setMissionList(loadedMissionList);
        setGuildLog(loadedGuildLog);
        setGuildGold(loadedGuildGold);
        setIsPaused(false);
        setDetailCharId(null);
        setShowRecruit(false);
        setShowMissions(false);
        setShowLootTable(false);
        setShowGuildLog(false);
        setShowDebug(false);
        setShowMap(false);
        setShowOptions(false);

        alert("Session loaded.");
      } catch (error) {
        console.error("Failed to load session:", error);
        alert("Invalid session file.");
      }
    };
    reader.onerror = () => {
      alert("Could not read session file.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="wow-shell w-full max-w-5xl mx-auto p-4 pb-20">
      <header className="wow-header flex justify-between items-center mb-6 border-b border-gray-700 pb-4 px-2 rounded-md">
        <div>
          <h1 className="wow-header-title fantasy-font text-xl md:text-3xl font-bold truncate">
            Alliance Manager
          </h1>
          <p className="text-amber-100/70 text-xs md:text-sm tracking-wide">
            WoW Guild Command
          </p>
        </div>
        <div className="text-right flex-none ml-2">
          <div className="text-sm md:text-xl fantasy-font">
            Mem:{" "}
            <span
              className={
                roster.length >= CONFIG.MAX_ROSTER ? "text-red-500" : ""
              }
            >
              {roster.length}
            </span>
            /{CONFIG.MAX_ROSTER}
          </div>
          <div className="text-xs md:text-sm text-yellow-400 font-bold mt-1">
            Gold: {guildGold}/{CONFIG.GOLD_CAP}
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`mt-2 px-3 py-1 rounded text-xs md:text-sm font-bold shadow border ${isPaused ? "bg-gray-800 border-yellow-600 text-yellow-500" : "bg-gray-800 border-gray-600 text-green-400"}`}
          >
            {isPaused ? "⏸" : "▶"}
          </button>
        </div>
      </header>

      <div className="flex overflow-x-auto gap-3 mb-6 pb-2 no-scrollbar snap-x">
        <button
          onClick={() => setShowRecruit(true)}
          disabled={roster.length >= CONFIG.MAX_ROSTER}
          className="flex-none snap-start btn-recruit text-yellow-100 font-bold py-3 px-6 rounded border border-yellow-900 shadow-lg flex items-center gap-2 select-none disabled:opacity-50 whitespace-nowrap"
        >
          <span className="text-xl">📜</span> Recruit
        </button>
        <button
          onClick={() => setShowMissions(true)}
          className="flex-none snap-start btn-quest text-blue-100 font-bold py-3 px-6 rounded border border-blue-800 shadow-lg flex items-center gap-2 select-none whitespace-nowrap"
        >
          <span className="text-xl">🛡️</span> Missions
        </button>
        <button
          onClick={() => setShowMap(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-cyan-800 text-cyan-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">🗺️</span> Map
        </button>
        <button
          onClick={() => setShowOptions(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-500 text-gray-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">⚙️</span> Options
        </button>
        <button
          onClick={() => setShowLootTable(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">📖</span> DB
        </button>
        <button
          onClick={() => setShowGuildLog(true)}
          className="wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-xl">📜</span> Log
        </button>
      </div>

      {activeMissions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
            Active
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMissions.map((m) => (
              <ActiveMissionCard
                key={`${m.questId}-${m.startTime}`}
                mission={m}
                onFinish={handleManualFinish}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {roster.length === 0 ? (
          <div className="text-gray-500 text-center col-span-full py-10 italic">
            Guild empty. Recruit heroes!
          </div>
        ) : (
          roster.map((char) => (
            <CharacterCard
              key={char.id}
              char={char}
              onClick={() => setDetailCharId(char.id)}
            />
          ))
        )}
      </div>

      <input
        ref={sessionFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleLoadSessionFile}
      />

      <OptionsModal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        onSaveSession={handleSaveSession}
        onLoadSession={handleLoadButtonClick}
        onOpenDebug={() => setShowDebug(true)}
      />

      <RecruitModal
        isOpen={showRecruit}
        onClose={() => setShowRecruit(false)}
        onRecruit={handleRecruit}
        availableSlots={Math.max(0, CONFIG.MAX_ROSTER - roster.length)}
      />
      <MissionModal
        isOpen={showMissions}
        onClose={() => setShowMissions(false)}
        roster={roster}
        onDeploy={handleDeploy}
        missionList={missionList}
      />
      <LootTableModal
        isOpen={showLootTable}
        onClose={() => setShowLootTable(false)}
      />
      <GuildLogModal
        isOpen={showGuildLog}
        onClose={() => setShowGuildLog(false)}
        logs={guildLog}
      />
      <DebugModal
        isOpen={showDebug}
        onClose={() => setShowDebug(false)}
        onBulkLevel={handleBulkLevel}
      />
      <WorldMapModal isOpen={showMap} onClose={() => setShowMap(false)} />
      <DetailModal
        char={roster.find((c) => c.id === detailCharId)}
        isOpen={!!detailCharId}
        onClose={() => setDetailCharId(null)}
        onDismiss={handleDismiss}
        onModeChange={handleModeChange}
        onProfChange={handleProfChange}
        onGenerateBackstory={handleGenerateBackstory}
        onUpdateBackstory={handleUpdateBackstory}
        onLevelChange={handleLevelChange}
        onRoleChange={(id, role) =>
          setRoster((p) => p.map((c) => (c.id !== id ? c : { ...c, role })))
        }
      />
    </div>
  );
};

export default App;
