import React, { useState } from "react";
import { CONFIG, DB_CLASSES, PROFESSIONS_LIST, ITEM_ICONS } from "../constants";
import {
  getQualityColor,
  getReqExp,
  getRoleIcon,
  getSkillCap,
  getNextTierLevel,
} from "../utils";

export const ItemSlot = ({ slotName, item }) => {
  const borderColor = item ? getQualityColor(item.quality) : "#444";
  return (
    <div className="flex items-center gap-3 bg-gray-800/50 p-2 rounded border border-gray-700 hover:bg-gray-700/50 transition-colors">
      <div
        className="w-10 h-10 flex-none rounded border flex items-center justify-center text-lg bg-black/40"
        style={{ borderColor }}
      >
        {ITEM_ICONS[slotName]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">
          {slotName}
        </div>
        <div
          className={`text-sm font-bold truncate ${!item ? "text-gray-600 italic" : ""}`}
          style={{ color: item ? borderColor : undefined }}
        >
          {item ? item.name : "Empty"}
        </div>
      </div>
    </div>
  );
};

export const CharacterCard = ({ char, onClick }) => {
  const classData = DB_CLASSES[char.charClass];
  if (!classData) return null;
  const isMax = char.level >= CONFIG.LEVEL_CAP;
  const pct = Math.min(100, (char.exp / char.maxExp) * 100);
  const isFlashing = Date.now() - char.lastLevelUp < 1000;

  return (
    <div
      onClick={() => onClick(char)}
      className={`relative bg-gray-800 border p-4 rounded-lg cursor-pointer transition-all active:scale-95 hover:-translate-y-1 hover:shadow-lg hover:border-yellow-500 ${char.status === "Questing" ? "border-blue-500 opacity-80" : "border-gray-600"} ${isFlashing ? "animate-levelup" : ""}`}
    >
      {char.status === "Questing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 font-bold text-blue-400 tracking-widest rounded-lg pointer-events-none">
          MISSION
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div
          className="font-bold text-lg truncate"
          style={{ color: classData.color }}
        >
          {char.name}
        </div>
        <div className="text-xs bg-black/40 px-2 py-1 rounded whitespace-nowrap">
          {isMax ? (
            <span className="text-yellow-500 font-bold">MAX</span>
          ) : (
            `Lvl ${char.level}`
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
        <span className="font-bold text-gray-300 uppercase text-xs">
          {char.race}
        </span>
        <span className="opacity-50">|</span>
        <span style={{ color: classData.color }}>{char.charClass}</span>
        <span className="opacity-50">|</span>
        <span className="text-white">{getRoleIcon(char.role)}</span>
      </div>

      <div className="mb-2">
        <div className="text-xs text-blue-300 italic truncate">
          {char.statusText}
        </div>
      </div>

      {!isMax ? (
        <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          ></div>
        </div>
      ) : (
        <div className="h-1.5 mt-2 border-t border-yellow-900/50"></div>
      )}
    </div>
  );
};

export const DetailModal = ({
  char,
  isOpen,
  onClose,
  onDismiss,
  onLevelChange,
  onRoleChange,
  onUpdateBackstory,
  onGenerateBackstory,
  onProfChange,
  onModeChange,
}) => {
  const [tab, setTab] = useState("stats");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !char) return null;
  const classData = DB_CLASSES[char.charClass];

  const handleGenBackstory = async () => {
    setIsGenerating(true);
    const story = await onGenerateBackstory(char);
    if (story) {
      onUpdateBackstory(char.id, story);
    }
    setIsGenerating(false);
  };

  const hardCap = getSkillCap(char.level);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border-x-0 border-y-0 md:border-2 border-gray-600 rounded-none md:rounded-lg w-full max-w-4xl h-full md:h-[80vh] flex flex-col relative shadow-2xl">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              {char.name}{" "}
              <span className="text-lg text-gray-500">
                {char.gender === "Male" ? "♂️" : "♀️"}
              </span>
            </h2>
            <div className="text-sm text-gray-400">
              {char.race}{" "}
              <span style={{ color: classData.color }}>{char.charClass}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-3xl px-2"
          >
            &times;
          </button>
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
        </div>

        <div className="overflow-y-auto p-4 md:p-6 custom-scrollbar flex-1 bg-gray-900">
          {tab === "stats" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full">
                  <div className="flex justify-between items-end mb-1">
                    <span className="font-bold text-gray-300">
                      Level {char.level}
                    </span>
                    <div className="flex gap-1">
                      {classData.allowedRoles.map((role) => (
                        <button
                          key={role}
                          onClick={() => onRoleChange(char.id, role)}
                          className={`px-2 py-0.5 text-[10px] uppercase rounded border transition-colors ${char.role === role ? "bg-blue-600 border-blue-400 text-white" : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"}`}
                        >
                          {getRoleIcon(role)} {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden border border-gray-600">
                    <div
                      className="bg-blue-500 h-full"
                      style={{
                        width: `${Math.min(100, (char.exp / getReqExp(char.level)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="text-right text-xs text-gray-400 mt-1">
                    {char.exp} / {getReqExp(char.level)} XP
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.keys(char.equipment).map((slot) => (
                  <ItemSlot
                    key={slot}
                    slotName={slot}
                    item={char.equipment[slot]}
                  />
                ))}
              </div>

              <div className="mt-4 bg-gray-800/50 p-3 rounded border border-purple-900/50 relative">
                <h3 className="text-[10px] text-purple-400 uppercase tracking-widest mb-1 font-bold">
                  Biography
                </h3>
                {char.backstory ? (
                  <p className="text-sm text-gray-300 italic">
                    "{char.backstory}"
                  </p>
                ) : (
                  <button
                    onClick={handleGenBackstory}
                    disabled={isGenerating}
                    className="text-xs bg-purple-900/40 hover:bg-purple-800 text-purple-300 border border-purple-700 px-2 py-1 rounded transition-colors"
                  >
                    {isGenerating ? "..." : "✨ Uncover Past"}
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-center mt-4">
                <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-700">
                  <span className="text-xs text-gray-500 uppercase mr-1">
                    Debug Level
                  </span>
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
            </div>
          )}

          {tab === "profs" && (
            <div className="space-y-6">
              <div className="bg-gray-800 p-4 rounded border border-gray-700">
                <h3 className="text-sm font-bold text-gray-300 uppercase mb-4">
                  Activity Focus
                </h3>
                <div className="flex gap-2">
                  {["Leveling", "Professions", "Auto"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onModeChange(char.id, mode)}
                      className={`flex-1 py-2 rounded border text-sm font-bold transition-colors ${char.activityMode === mode ? (mode === "Auto" ? "bg-purple-900 border-purple-500 text-white" : "bg-blue-900 border-blue-500 text-white") : "bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600"}`}
                    >
                      {mode === "Auto"
                        ? "🤖 Auto (Smart)"
                        : mode === "Leveling"
                          ? "⚔️ Leveling"
                          : "🔨 Professions"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  {char.activityMode === "Leveling" &&
                    "Focuses purely on gaining XP."}
                  {char.activityMode === "Professions" &&
                    "Pauses XP gain to level up skills."}
                  {char.activityMode === "Auto" &&
                    "Prioritizes leveling, but pauses at levels 5, 10, 15, 20 to cap skills."}
                </p>
              </div>

              <div className="space-y-4">
                {char.professions.map((prof, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800 p-3 rounded border border-gray-700"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={prof.name}
                          onChange={(e) =>
                            onProfChange(char.id, idx, e.target.value)
                          }
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
                        {prof.skill} / 300
                      </span>
                    </div>
                    <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-600">
                      <div
                        className="bg-yellow-600 h-full transition-all duration-300"
                        style={{ width: `${(prof.skill / hardCap) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>
                        Current Cap: {hardCap} (Lvl{" "}
                        {getNextTierLevel(char.level)})
                      </span>
                      <span>Max: 300</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
