import React, { useEffect, useState } from "react";
import { DB_CLASSES, GUILD_FACTION } from "../../constants";
import { generateCharacters, getRoleIcon, getRacePortraitUrl, getWowIconUrl } from "../../utils";
import BaseModal from "./BaseModal";

const RecruitModal = ({
  isOpen,
  onClose,
  onRecruit,
  availableSlots,
  openSlots,
  affordableSlots,
  recruitCostGold,
  guildFaction = GUILD_FACTION.ALLIANCE,
}) => {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [limitWarning, setLimitWarning] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    setIsLoading(true);
    setCandidates([]);
    setSelectedIds([]);
    setLimitWarning(false);
    const timer = setTimeout(() => {
      setCandidates(generateCharacters(3, guildFaction));
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [guildFaction, isOpen]);

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
    const selectedCandidates = candidates.filter((char) => selectedIds.includes(char.id));
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
            <h2 className="text-2xl fantasy-font text-yellow-500">Scouting...</h2>
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
                      color: DB_CLASSES[char.charClass] ? DB_CLASSES[char.charClass].color : "#fff",
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
                    Role: <span className="text-white">{char.role}</span> {getRoleIcon(char.role)}
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
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
              {openSlots <= 0 ? (
                <div className="text-xs text-red-400 border border-red-900/60 bg-red-950/30 px-3 py-1 rounded">
                  Member limit reached. Dismiss heroes to recruit more.
                </div>
              ) : affordableSlots <= 0 ? (
                <div className="text-xs text-yellow-300 border border-yellow-900/60 bg-yellow-950/30 px-3 py-1 rounded">
                  Not enough gold. Recruiting costs {recruitCostGold}g per hero.
                </div>
              ) : limitWarning ? (
                <div className="text-xs text-yellow-300 border border-yellow-900/60 bg-yellow-950/30 px-3 py-1 rounded">
                  Selection limit reached. Max selectable right now: {availableSlots}.
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Open slots: {openSlots} • Affordable now: {affordableSlots}
                </div>
              )}
              <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleRecruitSelected}
                  disabled={selectedIds.length === 0 || availableSlots <= 0}
                  className="px-4 py-2 border border-green-700 rounded text-xs uppercase tracking-wider text-green-300 hover:bg-green-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Recruit Selected ({selectedIds.length}) • {selectedIds.length * recruitCostGold}g
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

export default RecruitModal;
