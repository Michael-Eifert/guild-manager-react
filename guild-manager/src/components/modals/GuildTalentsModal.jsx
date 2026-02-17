import React, { useState } from "react";
import BaseModal from "./BaseModal";
import {
  GUILD_POINT_LABEL,
  GUILD_TALENT_DEFS,
  GUILD_TALENT_CATEGORY_META,
  buildGuildAchievementEntries,
  clampTalentRank,
} from "../../guildProgression";

const GuildTalentsModal = ({
  isOpen,
  onClose,
  guildProgress,
  guildDerivedStats,
  onUpgradeTalent,
}) => {
  const [category, setCategory] = useState("roster");
  const handleClose = () => {
    setCategory("roster");
    onClose();
  };

  if (!isOpen) return null;

  const achievementEntries = buildGuildAchievementEntries(guildProgress);
  const unlockedAchievements = achievementEntries.filter(
    (achievement) => achievement.unlocked,
  ).length;
  const talentDefs = Object.values(GUILD_TALENT_DEFS).filter(
    (talent) => talent.category === category,
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-amber-800 rounded-none md:rounded-lg w-full max-w-4xl h-full md:h-[80vh] flex flex-col relative shadow-2xl"
    >
      <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold fantasy-font text-amber-200">
            Guild Talents
          </h2>
          <div className="text-xs text-gray-400 mt-1">
            {GUILD_POINT_LABEL}:{" "}
            <span className="text-amber-300 font-bold">
              {guildProgress.renownPoints}
            </span>{" "}
            (earned {guildProgress.totalRenown})
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-white text-3xl px-2"
        >
          &times;
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/80 flex flex-wrap gap-2">
        {Object.entries(GUILD_TALENT_CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              category === key
                ? "border-amber-500 bg-amber-900/40 text-amber-200"
                : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {meta.title}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
            Milestones: {unlockedAchievements} / {achievementEntries.length}
          </div>
          <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
            Max Roster: {guildDerivedStats.maxRoster}
          </div>
          <div className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300">
            Gold Cap: {guildDerivedStats.goldCap}
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
                className={`rounded border px-2 py-2 text-xs flex items-center justify-between ${
                  achievement.unlocked
                    ? "border-emerald-700 bg-emerald-950/30 text-emerald-200"
                    : "border-gray-700 bg-gray-900/60 text-gray-400"
                }`}
              >
                <div className="flex flex-col">
                  <span>{achievement.label}</span>
                  {achievement.progress && (
                    <span className="text-[11px] opacity-80">
                      Progress: {achievement.progress}
                    </span>
                  )}
                </div>
                <span className="font-bold">{achievement.reward}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-400">
          {GUILD_TALENT_CATEGORY_META[category].subtitle}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {talentDefs.map((talent) => {
            const rank = clampTalentRank(talent.key, guildProgress.talents[talent.key]);
            const currentValue = rank > 0 ? talent.ranks[rank - 1].value : 0;
            const nextRank = talent.ranks[rank];
            const canUpgrade =
              Boolean(nextRank) &&
              guildProgress.renownPoints >= (nextRank?.cost || 0);

            return (
              <div
                key={talent.key}
                className="rounded border border-gray-700 bg-gray-800/70 p-4 space-y-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-amber-200">{talent.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{talent.description}</p>
                </div>

                <div className="text-xs text-gray-300">
                  Current:{" "}
                  <span className="text-white font-bold">
                    +{currentValue} {talent.suffix}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {talent.ranks.map((rankData, index) => {
                    const achieved = index < rank;
                    const next = index === rank;
                    return (
                      <div
                        key={`${talent.key}-rank-${index + 1}`}
                        className={`flex-1 rounded border px-2 py-2 text-center text-[11px] ${
                          achieved
                            ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                            : next
                              ? "border-amber-700 bg-amber-950/40 text-amber-300"
                              : "border-gray-700 bg-gray-900/70 text-gray-500"
                        }`}
                      >
                        <div className="font-bold">T{index + 1}</div>
                        <div>+{rankData.displayValue ?? rankData.value}</div>
                        <div>{rankData.cost} pt</div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => onUpgradeTalent(talent.key)}
                  disabled={!nextRank || !canUpgrade}
                  className="w-full px-3 py-2 rounded border border-amber-700 bg-amber-900/40 text-amber-100 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-800/50"
                >
                  {nextRank
                    ? `Upgrade (${nextRank.cost} ${GUILD_POINT_LABEL})`
                    : "Max Rank"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </BaseModal>
  );
};

export default GuildTalentsModal;
