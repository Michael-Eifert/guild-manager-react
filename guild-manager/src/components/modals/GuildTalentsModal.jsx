import React, { useState } from "react";
import BaseModal from "./BaseModal";
import {
  GUILD_POINT_LABEL,
  GUILD_TALENT_DEFS,
  GUILD_TALENT_TREE_TIERS,
  buildGuildAchievementEntries,
  clampTalentRank,
  getGuildTalentUpgradeStatus,
  getGuildTalentTreeNodeStatus,
} from "../../guildProgression";
import { GUILD_FOCUS, GUILD_FOCUS_OPTIONS } from "../../constants";

const GUILD_FOCUS_DESCRIPTIONS = Object.freeze({
  [GUILD_FOCUS.LEVELING]: "Members gain +5% XP from passive and mission rewards.",
  [GUILD_FOCUS.DUNGEONS]: "Dungeon success previews gain +5%.",
  [GUILD_FOCUS.SOCIAL]: "Full parties earn +5% gold.",
  [GUILD_FOCUS.RAID_ATTUNEMENTS]:
    "Auto groups prioritize raid key and attunement routes.",
});

const GuildTalentsModal = ({
  isOpen,
  onClose,
  variant = "modal",
  guildProgress,
  guildGold,
  guildDerivedStats,
  guildSetup,
  currentDayIndex,
  focusChangeCostGold = 10,
  onChangeGuildFocus,
  onUpgradeTalent,
}) => {
  const [activeTab, setActiveTab] = useState("achievements");
  const isPage = variant === "page";

  if (!isPage && !isOpen) return null;

  const achievementEntries = buildGuildAchievementEntries(guildProgress);
  const unlockedAchievements = achievementEntries.filter(
    (achievement) => achievement.unlocked,
  ).length;
  const currentFocus = guildSetup?.focus || GUILD_FOCUS.LEVELING;
  const focusChangedToday =
    Number.isFinite(Number(guildSetup?.lastFocusChangeDayIndex)) &&
    Number(guildSetup.lastFocusChangeDayIndex) === currentDayIndex;
  const canAffordFocusChange = (Number(guildGold) || 0) >= focusChangeCostGold;

  const content = (
    <>
      <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold fantasy-font text-amber-200">
            Guild Progression
          </h2>
          <div className="text-xs text-gray-400 mt-1">
            {GUILD_POINT_LABEL}:{" "}
            <span className="text-amber-300 font-bold">
              {guildProgress.renownPoints}
            </span>{" "}
            (earned {guildProgress.totalRenown})
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Guild Gold: <span className="text-yellow-300 font-bold">{guildGold}</span>
          </div>
        </div>
        {!isPage && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-3xl px-2"
          >
            &times;
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <div className="grid grid-cols-3 rounded border border-gray-700 bg-gray-950/50 p-1 text-xs font-bold">
          {[
            ["achievements", "Achievements"],
            ["talents", "Talent Tree"],
            ["focus", "Guild Focus"],
          ].map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              className={`rounded px-3 py-2 transition ${
                activeTab === tabKey
                  ? "bg-amber-900/50 text-amber-100 border border-amber-700"
                  : "text-gray-400 hover:text-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "achievements" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
                Milestones: {unlockedAchievements} / {achievementEntries.length}
              </div>
              <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
                Total {GUILD_POINT_LABEL}: {guildProgress.totalRenown}
              </div>
            </div>

            <div className="rounded border border-gray-700 bg-gray-800/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-amber-200 font-bold">
                  Guild Achievements
                </h3>
                <span className="text-[11px] text-gray-400">
                  {unlockedAchievements}/{achievementEntries.length} unlocked
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {achievementEntries.map((achievement) => (
                  <div
                    key={achievement.key}
                    className={`rounded border px-2 py-2 text-xs flex items-center justify-between gap-3 ${
                      achievement.unlocked
                        ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                        : "border-gray-700 bg-gray-900/60 text-gray-400"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span>{achievement.label}</span>
                      {achievement.progress && (
                        <span className="text-[11px] opacity-80">
                          Progress: {achievement.progress}
                        </span>
                      )}
                    </div>
                    <span className="font-bold whitespace-nowrap">{achievement.reward}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "talents" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
                Max Roster: {guildDerivedStats.maxRoster}
              </div>
              <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
                Gold Cap: {guildDerivedStats.goldCap}
              </div>
            </div>

            <div className="rounded border border-gray-700 bg-gray-800/60 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-amber-200 font-bold">
                  Guild Talent Tree
                </h3>
                <span className="text-[11px] text-gray-400">
                  Raid path is independent from economy path
                </span>
              </div>

              <div className="space-y-3">
                {GUILD_TALENT_TREE_TIERS.map((tierNodes, tierIndex) => (
                  <section
                    key={`talent-tier-${tierIndex + 1}`}
                    className="rounded border border-gray-700 bg-gray-900/40 p-2"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold mb-2">
                      Tier {tierIndex + 1}
                    </div>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(1, tierNodes.length)}, minmax(0, 1fr))`,
                      }}
                    >
                      {tierNodes.map((node) => {
                        const talent = GUILD_TALENT_DEFS[node.talentKey];
                        const currentRank = clampTalentRank(
                          node.talentKey,
                          guildProgress?.talents?.[node.talentKey],
                        );
                        const nodeStatus = getGuildTalentTreeNodeStatus(guildProgress, node);
                        const upgradeStatus = getGuildTalentUpgradeStatus(
                          guildProgress,
                          node.talentKey,
                        );
                        const missingGold = Math.max(
                          0,
                          (Number(upgradeStatus.goldCost) || 0) - (Number(guildGold) || 0),
                        );
                        const canUnlockWithGold =
                          nodeStatus.canUnlockNow && missingGold <= 0;
                        const targetRankData = talent?.ranks?.[node.targetRank - 1];
                        const targetValue = targetRankData?.displayValue ?? targetRankData?.value ?? 0;

                        const cardClass = nodeStatus.unlocked
                          ? "border-emerald-700 bg-emerald-950/35"
                          : nodeStatus.isCurrentTarget && nodeStatus.canUnlockNow
                            ? "border-amber-700 bg-amber-950/35"
                            : nodeStatus.isCurrentTarget
                              ? "border-red-800 bg-red-950/25"
                              : "border-gray-700 bg-gray-900/60";

                        return (
                          <div
                            key={node.id}
                            className={`rounded border p-2 text-xs space-y-2 ${cardClass}`}
                          >
                            <div className="font-bold text-amber-100 truncate">{node.label}</div>
                            <div className="text-[11px] text-gray-300">
                              {talent?.title} - Rank {node.targetRank}
                            </div>
                            <div className="text-[11px] text-gray-300">
                              +{targetValue} {talent?.suffix}
                            </div>

                            {nodeStatus.unlocked ? (
                              <div className="text-[11px] text-emerald-300 font-semibold">Unlocked</div>
                            ) : nodeStatus.isCurrentTarget ? (
                              <div className="space-y-1">
                                {nodeStatus.blockers.length > 0 && (
                                  <div className="text-[11px] text-red-300">
                                    {nodeStatus.blockers[0]}
                                  </div>
                                )}
                                {upgradeStatus.missingCost > 0 && (
                                  <div className="text-[11px] text-gray-300">
                                    Need {upgradeStatus.missingCost} more {GUILD_POINT_LABEL}.
                                  </div>
                                )}
                                {missingGold > 0 && (
                                  <div className="text-[11px] text-yellow-300">
                                    Need {missingGold}g more.
                                  </div>
                                )}
                                <button
                                  onClick={() => onUpgradeTalent(node.talentKey)}
                                  disabled={!canUnlockWithGold}
                                  className="w-full px-2 py-1 rounded border border-amber-700 bg-amber-900/40 text-amber-100 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-800/50"
                                >
                                  Unlock ({nodeStatus.cost} {GUILD_POINT_LABEL} + {nodeStatus.goldCost}g)
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-gray-500">
                                {currentRank + 1 < node.targetRank
                                  ? "Requires previous rank."
                                  : "Locked by prerequisites."}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "focus" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
                Current Focus:{" "}
                <span className="text-amber-200 font-bold">{currentFocus}</span>
              </div>
              <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
                Change Cost:{" "}
                <span className="text-yellow-300 font-bold">
                  {focusChangeCostGold}g
                </span>
              </div>
              <div
                className={`rounded border px-3 py-2 text-xs ${
                  focusChangedToday
                    ? "border-red-800 bg-red-950/30 text-red-200"
                    : "border-emerald-800 bg-emerald-950/25 text-emerald-200"
                }`}
              >
                {focusChangedToday
                  ? "Focus already changed today."
                  : "Focus can be changed today."}
              </div>
            </div>

            <div className="rounded border border-gray-700 bg-gray-800/60 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs uppercase tracking-wider text-amber-200 font-bold">
                  Guild Focus
                </h3>
                <span className="text-[11px] text-gray-400">
                  One change per calendar day
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {GUILD_FOCUS_OPTIONS.map((focus) => {
                  const isCurrent = focus === currentFocus;
                  const isDisabled =
                    isCurrent ||
                    focusChangedToday ||
                    !canAffordFocusChange ||
                    typeof onChangeGuildFocus !== "function";
                  return (
                    <div
                      key={focus}
                      className={`rounded border p-3 text-xs space-y-3 ${
                        isCurrent
                          ? "border-amber-700 bg-amber-950/35"
                          : "border-gray-700 bg-gray-900/60"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-amber-100">{focus}</div>
                        <div className="text-[11px] text-gray-300 mt-1">
                          {GUILD_FOCUS_DESCRIPTIONS[focus]}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChangeGuildFocus(focus)}
                        disabled={isDisabled}
                        className="w-full px-3 py-2 rounded border border-cyan-700 bg-cyan-950/40 text-cyan-100 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-900/50"
                      >
                        {isCurrent ? "Active" : `Set Focus (${focusChangeCostGold}g)`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {!canAffordFocusChange && (
                <div className="text-[11px] text-yellow-300">
                  Need {Math.max(0, focusChangeCostGold - (Number(guildGold) || 0))}g
                  more to change focus.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (isPage) {
    return (
      <section className="wow-modal-panel flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-lg border-2 border-amber-800 bg-gray-900 shadow-2xl">
        {content}
      </section>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-amber-800 rounded-none md:rounded-lg w-full max-w-4xl h-full md:h-[80vh] flex flex-col relative shadow-2xl"
    >
      {content}
    </BaseModal>
  );
};

export default GuildTalentsModal;
