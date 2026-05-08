import React, { useEffect, useMemo, useState } from "react";
import { CONFIG, DB_CLASSES, GUILD_FACTION } from "../../constants";
import { DB_ITEMS } from "../../data/items";
import {
  generateCharacters,
  getCharacterAverageItemLevel,
  getRacePortraitUrl,
  getRoleIcon,
  getWowIconUrl,
} from "../../utils";
import {
  buildRecruitmentEquipment,
  getRecruitmentCapacity,
  getRecruitmentTierOptions,
} from "../../recruitment/recruitmentLogic";
import BaseModal from "./BaseModal";

const getCandidateLevel = (tier) => {
  const minLevel = Math.max(1, Number(tier?.minLevel) || 1);
  const maxLevel = Math.max(minLevel, Number(tier?.maxLevel) || minLevel);
  return minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
};

const RecruitModal = ({
  isOpen,
  onClose,
  onRecruit,
  openSlots,
  guildGold = 0,
  maxRoster,
  rosterSize,
  guildProgress,
  raidUnlocked = false,
  onScoutTier,
  guildFaction = GUILD_FACTION.ALLIANCE,
  existingNames = [],
}) => {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [limitWarning, setLimitWarning] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState("level_1_10");
  const [activeTier, setActiveTier] = useState(null);

  const recruitmentTierOptions = useMemo(
    () => getRecruitmentTierOptions({ guildProgress, raidUnlocked }),
    [guildProgress, raidUnlocked],
  );
  const selectedTier =
    recruitmentTierOptions.find((tier) => tier.id === selectedTierId) ||
    recruitmentTierOptions[0];
  const activeRecruitCostGold = Math.max(
    1,
    Number(activeTier?.recruitCostGold) || 1,
  );
  const selectedRecruitCostGold =
    Math.max(0, selectedIds.length - 1) * activeRecruitCostGold;
  const currentCapacity = getRecruitmentCapacity({
    rosterSize,
    maxRoster,
    guildGold,
    recruitCostGold: activeRecruitCostGold,
  });

  const existingNamesSignature = useMemo(() => {
    const source = Array.isArray(existingNames) ? existingNames : [];
    const normalized = [
      ...new Set(
        source
          .map((name) => String(name || "").trim())
          .filter(Boolean),
      ),
    ].sort((left, right) => left.localeCompare(right));
    return JSON.stringify(normalized);
  }, [existingNames]);
  const stableExistingNames = useMemo(() => {
    try {
      const parsed = JSON.parse(existingNamesSignature);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [existingNamesSignature]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(false);
    setCandidates([]);
    setSelectedIds([]);
    setLimitWarning(false);
    setActiveTier(null);
    setSelectedTierId("level_1_10");
  }, [isOpen]);

  const buildCandidates = (tier) =>
    generateCharacters(5, guildFaction, {
      usedNames: stableExistingNames,
    }).map((candidate) => {
      const level = getCandidateLevel(tier);
      return {
        ...candidate,
        level,
        exp: 0,
        maxExp: CONFIG.XP_TABLE[level] || CONFIG.XP_TABLE[1],
        equipment: buildRecruitmentEquipment({
          character: { ...candidate, level },
          itemDatabase: DB_ITEMS,
        }),
      };
    });

  const handleSelectTier = (tier) => {
    setSelectedTierId(tier.id);
    setCandidates([]);
    setSelectedIds([]);
    setActiveTier(null);
    setLimitWarning(false);
  };

  const handleScoutTier = () => {
    if (!selectedTier?.unlocked || isLoading || openSlots <= 0) return;
    if (guildGold < selectedTier.scoutCostGold) return;
    if (typeof onScoutTier === "function" && !onScoutTier(selectedTier)) return;

    setIsLoading(true);
    setCandidates([]);
    setSelectedIds([]);
    setLimitWarning(false);
    const tier = selectedTier;
    window.setTimeout(() => {
      setActiveTier(tier);
      setCandidates(buildCandidates(tier));
      setIsLoading(false);
    }, 500);
  };

  const toggleCandidate = (candidateId) => {
    if (!activeTier) return;
    setSelectedIds((prev) => {
      if (prev.includes(candidateId)) {
        setLimitWarning(false);
        return prev.filter((id) => id !== candidateId);
      }

      if (
        currentCapacity.availableSlots <= 0 ||
        prev.length >= currentCapacity.availableSlots
      ) {
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
    onRecruit(selectedCandidates, activeTier);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-yellow-700 rounded-none md:rounded-lg w-full max-w-5xl h-full md:h-[90vh] overflow-y-auto relative"
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-4 text-gray-500 hover:text-white text-3xl z-10"
      >
        &times;
      </button>
      <div className="p-6">
        <h2 className="text-2xl text-center mb-6 fantasy-font mt-8 md:mt-0">
          Recruitment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {recruitmentTierOptions.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            const canAffordScout = guildGold >= tier.scoutCostGold;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleSelectTier(tier)}
                disabled={!tier.unlocked}
                className={`text-left p-3 rounded border transition-colors ${
                  isSelected
                    ? "border-yellow-500 bg-yellow-900/20"
                    : "border-gray-700 bg-gray-800/80 hover:bg-gray-700"
                } ${!tier.unlocked ? "opacity-50 cursor-not-allowed hover:bg-gray-800/80" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-yellow-200">{tier.label}</span>
                  <span
                    className={canAffordScout ? "text-green-300" : "text-red-300"}
                  >
                    {tier.scoutCostGold}g
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  5 applicants - first free - +{tier.recruitCostGold}g each
                </div>
                {!tier.unlocked && (
                  <div className="text-[11px] text-red-300 mt-1">
                    {tier.blockers.join(" ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 rounded border border-gray-700 bg-gray-800/50 p-3">
          <div className="text-xs text-gray-300">
            Guild gold: <span className="text-yellow-300">{guildGold}g</span> -
            Open slots: <span className="text-cyan-200">{openSlots}</span>
          </div>
          <button
            type="button"
            onClick={handleScoutTier}
            disabled={
              !selectedTier?.unlocked ||
              isLoading ||
              openSlots <= 0 ||
              guildGold < selectedTier.scoutCostGold
            }
            className="px-4 py-2 border border-yellow-700 rounded text-xs uppercase tracking-wider text-yellow-200 hover:bg-yellow-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Scout {selectedTier?.label} ({selectedTier?.scoutCostGold || 0}g)
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">Search</div>
            <h3 className="text-2xl fantasy-font text-yellow-500">
              Scouting...
            </h3>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-gray-800 rounded bg-gray-950/30">
            Select an unlocked tier and scout applicants.
          </div>
        ) : (
          <div>
            <h3 className="text-lg text-center mb-4 fantasy-font text-yellow-100">
              Applicants Found - {activeTier?.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              {candidates.map((char) => (
                <div
                  key={char.id}
                  onClick={() => toggleCandidate(char.id)}
                  className={`bg-gray-800 p-4 rounded flex flex-col items-center text-center cursor-pointer border hover:bg-gray-700 transition-all active:scale-95 ${
                    selectedIds.includes(char.id)
                      ? "border-green-500 bg-green-900/20"
                      : "border-transparent hover:border-yellow-500"
                  }`}
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
                    className="font-bold text-base inline-flex items-center gap-1"
                    style={{
                      color: DB_CLASSES[char.charClass]
                        ? DB_CLASSES[char.charClass].color
                        : "#fff",
                    }}
                  >
                    <span>{char.name}</span>
                    <span className="text-sm text-gray-400">
                      {char.gender === "Male" ? "M" : "F"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-2 inline-flex items-center gap-1">
                    {DB_CLASSES[char.charClass]?.icon && (
                      <img
                        src={DB_CLASSES[char.charClass].icon}
                        alt={char.charClass}
                        className="w-4 h-4 rounded-sm border border-gray-600"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <span>{char.charClass}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                    Lvl {char.level} -{" "}
                    <span className="text-white">{char.role}</span>{" "}
                    {getRoleIcon(char.role)}
                  </div>
                  <div className="text-[11px] text-amber-200 font-bold mb-3">
                    iLvl {getCharacterAverageItemLevel(char).toFixed(1)}
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCandidate(char.id);
                    }}
                    className={`mt-auto px-4 py-2 border rounded text-xs uppercase tracking-wider w-full ${
                      selectedIds.includes(char.id)
                        ? "text-green-200 border-green-500 bg-green-900/40"
                        : "text-green-400 border-gray-600 hover:bg-green-900"
                    }`}
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
              ) : limitWarning ? (
                <div className="text-xs text-yellow-300 border border-yellow-900/60 bg-yellow-950/30 px-3 py-1 rounded">
                  Selection limit reached. Max selectable right now:{" "}
                  {currentCapacity.availableSlots}.
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Open slots: {openSlots} - First recruit free - Additional
                  affordable: {currentCapacity.affordableSlots}
                </div>
              )}
              <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleRecruitSelected}
                  disabled={
                    selectedIds.length === 0 ||
                    currentCapacity.availableSlots <= 0
                  }
                  className="px-4 py-2 border border-green-700 rounded text-xs uppercase tracking-wider text-green-300 hover:bg-green-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Recruit Selected ({selectedIds.length}) -{" "}
                  {selectedRecruitCostGold}g
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
