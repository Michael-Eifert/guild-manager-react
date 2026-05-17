import { DB_CLASSES } from "../constants";
import {
  getDungeonBossNames,
  getMissionWipeCost,
} from "../missions/missionHelpers";
import { getRacePortraitUrl, getRoleIcon, getWowIconUrl } from "../utils";

const ActiveMissionCard = ({ mission, onFinish, gameTimeMs, roster }) => {
  const now = Number.isFinite(gameTimeMs) ? gameTimeMs : mission.startTime || 0;
  const timeLeft = Math.max(0, mission.finishTime - now);
  const progress = 100 - (timeLeft / mission.totalDuration) * 100;
  const successChance =
    typeof mission.successChance === "number" ? mission.successChance : 100;
  const dungeonProgress = mission.dungeonProgress;
  const stepResults = Array.isArray(dungeonProgress?.stepResults)
    ? dungeonProgress.stepResults
    : [];
  const activeStepIndex =
    typeof dungeonProgress?.currentStep === "number"
      ? dungeonProgress.currentStep
      : 0;
  const dungeonBossNames = getDungeonBossNames(mission);
  const dungeonBossCount = dungeonBossNames.length;
  const stepResultsByStep = stepResults.reduce((acc, result) => {
    const step = Number(result?.step);
    if (!Number.isFinite(step) || step <= 0) return acc;
    if (!acc.has(step)) acc.set(step, []);
    acc.get(step).push(result);
    return acc;
  }, new Map());
  const chainContext = mission.chainContext;
  const chainTotal = Number(chainContext?.totalMissions) || 0;
  const chainPosition = Number(chainContext?.currentPosition) || 0;
  const attemptsUsed = Math.max(
    0,
    Math.floor(Number(dungeonProgress?.attemptsUsed) || 0),
  );
  const maxAttempts = Math.max(
    0,
    Math.floor(Number(dungeonProgress?.maxAttempts) || 0),
  );
  const wipeCost = getMissionWipeCost(mission);
  const partyMembers =
    mission.type === "dungeon" && mission.isRaid !== true
      ? (Array.isArray(mission.memberIds) ? mission.memberIds : [])
          .map((memberId) =>
            (Array.isArray(roster) ? roster : []).find(
              (member) => String(member?.id) === String(memberId),
            ),
          )
          .filter(Boolean)
      : [];
  return (
    <div className="wow-card p-3 rounded flex flex-col gap-2 shadow-lg relative overflow-hidden border border-gray-600 bg-gray-800">
      <div className="flex justify-between items-center z-10 relative">
        <span className="font-bold text-sm text-white flex items-center gap-1">
          {mission.isRaid
            ? "\u{1F525}"
            : mission.type === "dungeon"
              ? "\u{1F3F0}"
              : "\u{1F4DC}"}{" "}
          {mission.name}
        </span>
        <span className="text-xs text-gray-400">
          {Math.ceil(timeLeft / 1000)}s
        </span>
      </div>
      <div className="text-[11px] text-amber-200/80">
        Success chance: {successChance}%
      </div>
      {chainContext && chainTotal > 1 && (
        <div className="text-[11px] text-indigo-200/80">
          Chain: {chainContext.setName || "Dungeon Set"} (
          {Math.max(1, chainPosition)}/{chainTotal})
        </div>
      )}
      {mission.type === "dungeon" && (
        <>
          <div className="text-[11px] text-gray-300">
            Cleared: {dungeonProgress?.clearedSteps || 0}/{dungeonBossCount}{" "}
            bosses
          </div>
          {mission.isRaid !== true && partyMembers.length > 0 && (
            <div className="rounded border border-gray-700 bg-gray-900/60 p-2">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                Dungeon Party
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {partyMembers.map((member) => {
                  const classData = DB_CLASSES[member.charClass] || {};
                  return (
                    <div
                      key={`${mission.instanceId || mission.id}-${member.id}`}
                      className="flex items-center gap-2 min-w-0 rounded border border-gray-700 bg-black/25 px-2 py-1.5"
                    >
                      <img
                        src={getRacePortraitUrl(member.race, member.gender)}
                        alt={`${member.race || "Unknown"} ${member.gender || ""}`}
                        className="w-8 h-8 rounded border border-gray-600 object-cover flex-none"
                        onError={(event) => {
                          event.currentTarget.src = getWowIconUrl(
                            "inv_misc_questionmark",
                          );
                        }}
                      />
                      {classData.icon && (
                        <img
                          src={classData.icon}
                          alt={member.charClass}
                          className="w-5 h-5 rounded-sm border border-gray-600 flex-none"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-bold truncate"
                          style={{ color: classData.color || "#e5e7eb" }}
                        >
                          {member.name}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {member.race} {member.charClass}
                        </div>
                      </div>
                      <div className="flex-none inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-950/60 px-2 py-1 text-[10px] text-gray-200">
                        <span>{getRoleIcon(member.role)}</span>
                        <span>{member.role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {maxAttempts > 0 && (
            <div className="text-[11px] text-amber-200/80">
              Attempts: {attemptsUsed}/{maxAttempts}
            </div>
          )}
          {wipeCost > 0 && (
            <div className="text-[11px] text-rose-200/90">
              Wipe Cost: {wipeCost}g / wipe
            </div>
          )}
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${
                mission.isRaid
                  ? Math.min(5, Math.max(1, dungeonBossCount))
                  : Math.max(1, dungeonBossCount)
              }, minmax(0, 1fr))`,
            }}
          >
            {dungeonBossNames.map((label, index) => {
              const stepAttemptResults = stepResultsByStep.get(index + 1) || [];
              const latestStepResult =
                stepAttemptResults[stepAttemptResults.length - 1];
              const hasResolved = stepAttemptResults.length > 0;
              const failedAttempts = stepAttemptResults.filter(
                (result) => result?.outcome === "failed",
              ).length;
              const failed =
                hasResolved && latestStepResult?.outcome === "failed";
              const cleared =
                hasResolved && latestStepResult?.outcome === "cleared";
              const isActive =
                !dungeonProgress?.finished &&
                !hasResolved &&
                index === activeStepIndex;
              const isRetryingAfterWipe =
                !dungeonProgress?.finished &&
                index === activeStepIndex &&
                failedAttempts > 0 &&
                !cleared;
              const className = cleared
                ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                : isRetryingAfterWipe
                  ? "border-amber-700 bg-amber-950/40 text-amber-300"
                  : failed
                    ? "border-red-700 bg-red-950/40 text-red-300"
                    : isActive
                      ? "border-amber-700 bg-amber-950/40 text-amber-300"
                      : "border-gray-700 bg-gray-900/60 text-gray-500";
              const stepLabel =
                failedAttempts > 0 ? `${label} (${failedAttempts}w)` : label;
              return (
                <div
                  key={`${mission.instanceId || mission.id}-${label}`}
                  className={`rounded border px-1 py-1 text-[10px] text-center ${className}`}
                >
                  {stepLabel}
                </div>
              );
            })}
          </div>
        </>
      )}
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
        {"\u26A1"} Instant Finish
      </button>
    </div>
  );
};

export default ActiveMissionCard;
