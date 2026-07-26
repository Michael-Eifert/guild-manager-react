import React, { useEffect, useMemo, useState } from "react";
import { DB_CLASSES } from "../../constants";
import {
  getCharacterAverageItemLevel,
  getRacePortraitUrl,
  getRoleIcon,
  getWowIconUrl,
} from "../../utils";
import {
  getRecruitmentCapacity,
  getRecruitmentTierOptions,
} from "../../recruitment/recruitmentLogic";
import BaseModal from "./BaseModal";

const SCOUT_COUNT_MIN = 5;
const SCOUT_COUNT_MAX = 15;

const getScoutCostGold = (tier, count) => {
  const baseCost = Math.max(0, Number(tier?.scoutCostGold) || 0);
  const extraProspects = Math.max(0, Math.floor(Number(count) || 0) - SCOUT_COUNT_MIN);
  const extraCost = Math.ceil(baseCost / SCOUT_COUNT_MIN) * extraProspects;
  return baseCost + extraCost;
};

const RecruitModal = ({
  isOpen,
  onClose,
  variant = "modal",
  onRecruit,
  openSlots,
  guildGold = 0,
  maxRoster,
  rosterSize,
  guildProgress,
  raidUnlocked = false,
  onScoutTier,
  applications = [],
  onRecruitApplications,
  onDeclineApplications,
  marketStats,
}) => {
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState([]);
  const [limitWarning, setLimitWarning] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState("level_1_10");
  const [activeTier, setActiveTier] = useState(null);
  const [scoutCount, setScoutCount] = useState(SCOUT_COUNT_MIN);
  const [scoutMessage, setScoutMessage] = useState("");

  const recruitmentTierOptions = useMemo(
    () => getRecruitmentTierOptions({ guildProgress, raidUnlocked }),
    [guildProgress, raidUnlocked],
  );
  const selectedTier =
    recruitmentTierOptions.find((tier) => tier.id === selectedTierId) ||
    recruitmentTierOptions[0];
  const selectedScoutCostGold = getScoutCostGold(selectedTier, scoutCount);
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
  const applicationList = Array.isArray(applications) ? applications : [];
  const safeMarketStats = marketStats && typeof marketStats === "object"
    ? marketStats
    : {};
  const selectedBandAvailable =
    safeMarketStats.levelBands?.[selectedTier?.id] ?? null;

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(false);
    setCandidates([]);
    setSelectedIds([]);
    setSelectedApplicationIds([]);
    setLimitWarning(false);
    setActiveTier(null);
    setScoutCount(SCOUT_COUNT_MIN);
    setScoutMessage("");
    setSelectedTierId("level_1_10");
  }, [isOpen]);

  const handleSelectTier = (tier) => {
    setSelectedTierId(tier.id);
    setCandidates([]);
    setSelectedIds([]);
    setSelectedApplicationIds([]);
    setActiveTier(null);
    setLimitWarning(false);
    setScoutMessage("");
  };

  const handleScoutTier = () => {
    if (!selectedTier?.unlocked || isLoading || openSlots <= 0) return;
    if (guildGold < selectedScoutCostGold) return;
    if (typeof onScoutTier !== "function") return;

    setIsLoading(true);
    setCandidates([]);
    setSelectedIds([]);
    setLimitWarning(false);
    const tier = selectedTier;
    window.setTimeout(() => {
      const scoutedCandidates = onScoutTier(tier, {
        count: scoutCount,
        scoutCostGold: selectedScoutCostGold,
      });
      setActiveTier(tier);
      setCandidates(Array.isArray(scoutedCandidates) ? scoutedCandidates : []);
      setScoutMessage(
        Array.isArray(scoutedCandidates) && scoutedCandidates.length > 0
          ? ""
          : "No available realm prospects matched that range right now.",
      );
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

  const toggleApplication = (candidateId) => {
    setSelectedApplicationIds((prev) => {
      if (prev.includes(candidateId)) {
        setLimitWarning(false);
        return prev.filter((id) => id !== candidateId);
      }

      if (openSlots <= 0 || prev.length >= openSlots) {
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
    const recruitedCandidates = onRecruit(selectedCandidates, activeTier);
    if (!Array.isArray(recruitedCandidates) || recruitedCandidates.length === 0) {
      return;
    }

    const recruitedIds = new Set(
      recruitedCandidates.flatMap((candidate) =>
        [candidate?.id, candidate?.realmPlayerId]
          .map((value) => String(value || ""))
          .filter(Boolean),
      ),
    );
    setCandidates((previousCandidates) =>
      previousCandidates.filter(
        (candidate) =>
          ![candidate?.id, candidate?.realmPlayerId]
            .map((value) => String(value || ""))
            .filter(Boolean)
            .some((id) => recruitedIds.has(id)),
      ),
    );
    setSelectedIds([]);
    setLimitWarning(false);
    setScoutMessage("Recruitment complete. Scout again to find more prospects.");
  };

  const handleAcceptApplications = () => {
    const selectedApplications = applicationList.filter((char) =>
      selectedApplicationIds.includes(char.id),
    );
    if (selectedApplications.length === 0) return;
    if (typeof onRecruitApplications === "function") {
      onRecruitApplications(selectedApplications);
    }
  };

  const handleDeclineSelectedApplications = () => {
    const selectedApplications = applicationList.filter((char) =>
      selectedApplicationIds.includes(char.id),
    );
    if (selectedApplications.length === 0) return;
    if (typeof onDeclineApplications === "function") {
      onDeclineApplications(selectedApplications);
      setSelectedApplicationIds([]);
    }
  };

  const handleDeclineApplication = (char) => {
    if (!char || typeof onDeclineApplications !== "function") return;
    onDeclineApplications([char]);
    setSelectedApplicationIds((prev) => prev.filter((id) => id !== char.id));
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-yellow-700 rounded-none md:rounded-lg w-full max-w-5xl h-full md:h-[90vh] overflow-y-auto relative"
      pageClassName="wow-modal-panel min-h-[calc(100dvh-10rem)] w-full overflow-y-auto rounded-xl border border-yellow-700/70 bg-gray-900 shadow-2xl"
      ariaLabel="Recruitment"
    >
      {variant !== "page" && (
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-gray-500 hover:text-white text-3xl z-10"
        >
          &times;
        </button>
      )}
      <div className="p-6">
        <h2
          className={`text-2xl text-center mb-6 fantasy-font ${
            variant === "page" ? "mt-0" : "mt-8 md:mt-0"
          }`}
        >
          Recruitment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {recruitmentTierOptions.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            const tierScoutCost = getScoutCostGold(tier, scoutCount);
            const canAffordScout = guildGold >= tierScoutCost;
            const bandAvailable = safeMarketStats.levelBands?.[tier.id];
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
                    {tierScoutCost}g
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {scoutCount} realm prospects - first recruit free - +{tier.recruitCostGold}g each
                </div>
                {Number.isFinite(Number(bandAvailable)) && (
                  <div className="text-[11px] text-cyan-200/80 mt-1">
                    {bandAvailable} available in this band
                  </div>
                )}
                {!tier.unlocked && (
                  <div className="text-[11px] text-red-300 mt-1">
                    {tier.blockers.join(" ")}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6 rounded border border-gray-700 bg-gray-800/50 p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="text-xs text-gray-300">
            <div>
              Guild gold: <span className="text-yellow-300">{guildGold}g</span> -
              Open slots: <span className="text-cyan-200">{openSlots}</span>
            </div>
            <div className="mt-1 text-gray-400">
              Market:{" "}
              <span className="text-cyan-100">
                {safeMarketStats.availableCount || 0} available
              </span>
              {safeMarketStats.minLevel != null && safeMarketStats.maxLevel != null && (
                <>
                  {" "}
                  - Lv {safeMarketStats.minLevel} to {safeMarketStats.maxLevel}
                  {safeMarketStats.averageLevel != null
                    ? `, avg ${safeMarketStats.averageLevel}`
                    : ""}
                </>
              )}
              {selectedBandAvailable != null && (
                <>
                  {" "}
                  - Selected band: {selectedBandAvailable}
                </>
              )}
            </div>
            <label className="mt-3 block max-w-sm">
              <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-gray-500">
                <span>Scout size</span>
                <span className="font-bold text-cyan-200">{scoutCount}</span>
              </div>
              <input
                type="range"
                min={SCOUT_COUNT_MIN}
                max={SCOUT_COUNT_MAX}
                step="1"
                value={scoutCount}
                onChange={(event) => setScoutCount(Number(event.target.value))}
                className="mt-1 w-full accent-yellow-500"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleScoutTier}
            disabled={
              !selectedTier?.unlocked ||
              isLoading ||
              openSlots <= 0 ||
              guildGold < selectedScoutCostGold
            }
            className="px-4 py-2 border border-yellow-700 rounded text-xs uppercase tracking-wider text-yellow-200 hover:bg-yellow-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Scout {selectedTier?.label} ({selectedScoutCostGold}g)
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
            {scoutMessage || "Select an unlocked tier and scout realm prospects."}
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
                  {char.realmRecruitmentSource && (
                    <div className="mb-3 rounded border border-cyan-900/60 bg-cyan-950/30 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                      {char.realmRecruitmentSource}
                    </div>
                  )}
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
                {variant !== "page" && (
                  <button
                    onClick={onClose}
                    className="text-red-400 text-sm hover:text-white border-b border-red-900 p-2"
                  >
                    Reject All
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-yellow-900/40 pt-6">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="fantasy-font text-lg text-yellow-100">
                Guild Applications
              </h3>
              <p className="text-xs text-gray-400">
                Realm players who asked to join. Accepting them is free.
              </p>
            </div>
            <div className="text-xs text-cyan-100">
              Open applications:{" "}
              <span className="font-bold text-yellow-200">
                {applicationList.length}
              </span>
            </div>
          </div>

          {applicationList.length === 0 ? (
            <div className="rounded border border-gray-800 bg-gray-950/30 px-4 py-8 text-center text-sm text-gray-400">
              No open applications right now. New ones can arrive as realm days
              pass.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {applicationList.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => toggleApplication(char.id)}
                    className={`bg-gray-800 p-3 rounded flex flex-col items-center text-center cursor-pointer border hover:bg-gray-700 transition-all active:scale-95 ${
                      selectedApplicationIds.includes(char.id)
                        ? "border-green-500 bg-green-900/20"
                        : "border-cyan-900/50 hover:border-yellow-500"
                    } ${openSlots <= 0 ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <img
                      src={getRacePortraitUrl(char.race, char.gender)}
                      alt={`${char.race} ${char.gender}`}
                      className="w-14 h-14 mb-2 rounded border border-gray-600 object-cover"
                      onError={(event) => {
                        event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                      }}
                    />
                    <div
                      className="font-bold text-sm inline-flex items-center gap-1"
                      style={{
                        color: DB_CLASSES[char.charClass]
                          ? DB_CLASSES[char.charClass].color
                          : "#fff",
                      }}
                    >
                      <span>{char.name}</span>
                      <span className="text-xs text-gray-400">
                        {char.gender === "Male" ? "M" : "F"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
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
                      <span>
                        Lvl {char.level} - {char.role} {getRoleIcon(char.role)}
                      </span>
                    </div>
                    <div className="mb-2 text-[11px] font-bold text-amber-200">
                      iLvl {getCharacterAverageItemLevel(char).toFixed(1)}
                    </div>
                    <div className="mb-2 rounded border border-cyan-900/60 bg-cyan-950/30 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                      {char.realmRecruitmentSource || "Free Agent"}
                    </div>
                    {Number.isFinite(Number(char.realmApplicationDayIndex)) && (
                      <div className="mb-3 text-[10px] uppercase tracking-wide text-gray-500">
                        Applied day {char.realmApplicationDayIndex}
                      </div>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleApplication(char.id);
                      }}
                      disabled={openSlots <= 0}
                      className={`mt-auto px-3 py-2 border rounded text-xs uppercase tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedApplicationIds.includes(char.id)
                          ? "text-green-200 border-green-500 bg-green-900/40"
                          : "text-cyan-200 border-gray-600 hover:bg-cyan-900/40"
                      }`}
                    >
                      {selectedApplicationIds.includes(char.id)
                        ? "Selected"
                        : "Select"}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeclineApplication(char);
                      }}
                      disabled={typeof onDeclineApplications !== "function"}
                      className="mt-2 w-full rounded border border-red-900/70 px-3 py-2 text-xs uppercase tracking-wider text-red-300 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <div className="text-xs text-gray-500">
                  Open slots: {openSlots} - Applications cost 0g.
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handleAcceptApplications}
                    disabled={
                      selectedApplicationIds.length === 0 ||
                      openSlots <= 0 ||
                      typeof onRecruitApplications !== "function"
                    }
                    className="px-4 py-2 border border-cyan-700 rounded text-xs uppercase tracking-wider text-cyan-200 hover:bg-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Accept Applications ({selectedApplicationIds.length}) - Free
                  </button>
                  <button
                    onClick={handleDeclineSelectedApplications}
                    disabled={
                      selectedApplicationIds.length === 0 ||
                      typeof onDeclineApplications !== "function"
                    }
                    className="px-4 py-2 border border-red-900 rounded text-xs uppercase tracking-wider text-red-300 hover:bg-red-950/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Decline Selected ({selectedApplicationIds.length})
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default RecruitModal;
