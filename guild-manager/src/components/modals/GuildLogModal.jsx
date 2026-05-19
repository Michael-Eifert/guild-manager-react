import { useMemo, useState } from "react";
import { getQualityClass } from "../../utils";
import BaseModal from "./BaseModal";

const LOG_FILTERS = Object.freeze([
  { id: "all", label: "All" },
  { id: "world", label: "World" },
  { id: "dungeon", label: "Dungeon" },
  { id: "raid", label: "Raid" },
  { id: "pvp", label: "PvP" },
]);

const normalizeLogSourceName = (value) =>
  String(value || "")
    .trim()
    .replace(/^zone:\s*/i, "")
    .toLowerCase();

const getMissionScenario = (mission) => {
  if (!mission) return null;
  if (mission.isRaid === true) return "raid";
  if (mission.type === "dungeon") return "dungeon";
  if (mission.type === "quest" || mission.type === "zone") return "world";
  return null;
};

const buildMissionScenarioLookup = (missionList) =>
  (Array.isArray(missionList) ? missionList : []).reduce((lookup, mission) => {
    const scenario = getMissionScenario(mission);
    if (!scenario) return lookup;

    const names = [mission.name];
    if (mission.type === "zone" && mission.name?.startsWith("Zone: ")) {
      names.push(mission.name.replace(/^Zone:\s*/i, ""));
    }

    names.forEach((name) => {
      const key = normalizeLogSourceName(name);
      if (key) lookup.set(key, scenario);
    });

    return lookup;
  }, new Map());

const getLogScenario = (log, missionScenarioLookup) => {
  if (log?.type === "calendar") return "raid";
  if (log?.type === "pvp") return "pvp";
  if (log?.type === "zone-clear" || log?.type === "zone-gold") return "world";
  if (log?.missionName === "World Drop") return "world";

  const missionKey = normalizeLogSourceName(log?.missionName);
  return missionKey ? missionScenarioLookup.get(missionKey) || null : null;
};

const GuildLogModal = ({ isOpen, onClose, logs, missionList = [] }) => {
  const [activeFilter, setActiveFilter] = useState("all");
  const missionScenarioLookup = useMemo(
    () => buildMissionScenarioLookup(missionList),
    [missionList],
  );
  const logsWithScenario = useMemo(
    () =>
      logs.map((log) => ({
        log,
        scenario: getLogScenario(log, missionScenarioLookup),
      })),
    [logs, missionScenarioLookup],
  );
  const filterCounts = useMemo(
    () =>
      logsWithScenario.reduce(
        (counts, entry) => {
          counts.all += 1;
          if (entry.scenario) counts[entry.scenario] += 1;
          return counts;
        },
        { all: 0, world: 0, dungeon: 0, raid: 0, pvp: 0 },
      ),
    [logsWithScenario],
  );
  const visibleLogs = useMemo(
    () =>
      activeFilter === "all"
        ? logsWithScenario
        : logsWithScenario.filter((entry) => entry.scenario === activeFilter),
    [activeFilter, logsWithScenario],
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-gray-600 rounded-none md:rounded-lg w-full max-w-2xl h-full md:h-[80vh] flex flex-col relative shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white fantasy-font">
            Guild Log
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-3xl px-2"
          >
            &times;
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/80">
          <div className="flex items-center gap-2 flex-wrap">
            {LOG_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  activeFilter === filter.id
                    ? "border-yellow-500 bg-yellow-900/40 text-yellow-200"
                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {filter.label}
                <span className="ml-1 text-[10px] text-gray-400">
                  {filterCounts[filter.id]}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic text-center py-10">No events yet.</div>
          ) : visibleLogs.length === 0 ? (
            <div className="text-gray-500 italic text-center py-10">
              No {LOG_FILTERS.find((filter) => filter.id === activeFilter)?.label} events yet.
            </div>
          ) : (
            visibleLogs.map(({ log, scenario }, i) => (
              <div
                key={`${log.time || "log"}-${i}`}
                className="border-l-2 border-gray-700 pl-3 py-1 text-gray-300"
              >
                <span className="text-xs text-gray-500 block">{log.time}</span>
                {log.type === "mission" ? (
                  <span className={log.outcome === "failed" ? "text-red-300" : "text-green-300"}>
                    {log.missionName}: {log.outcome === "failed" ? "Failed" : "Completed"}
                    {typeof log.bossesCleared === "number" &&
                    typeof log.totalBosses === "number"
                      ? ` (${log.bossesCleared}/${log.totalBosses} bosses)`
                      : ""}
                    {typeof log.successChance === "number" && typeof log.failChance === "number"
                      ? ` (S ${log.successChance}% / F ${log.failChance}%)`
                      : ""}
                  </span>
                ) : log.type === "dungeon-step" ? (
                  <span className={log.outcome === "failed" ? "text-red-300" : "text-emerald-300"}>
                    {log.missionName}: {log.bossName}{" "}
                    {log.outcome === "failed" ? "wiped the party" : "cleared"}.
                  </span>
                ) : log.type === "mission-attempt" ? (
                  <span className="text-amber-200">
                    {log.missionName}: wipe on {log.bossName} (attempts{" "}
                    {log.attemptsUsed}/{log.maxAttempts}, {log.attemptsRemaining} left).
                  </span>
                ) : log.type === "wipe-cost" ? (
                  <span className="text-rose-300">
                    {log.missionName}: wipe cost {log.amount}g paid ({log.wipeCount} wipe
                    {log.wipeCount === 1 ? "" : "s"} @ {log.wipeCost}g).
                    {log.unpaidAmount > 0 ? ` Missing ${log.unpaidAmount}g.` : ""}
                  </span>
                ) : log.type === "dungeon-chain" ? (
                  <span
                    className={
                      log.outcome === "stopped"
                        ? "text-red-300"
                        : log.outcome === "completed"
                          ? "text-emerald-300"
                          : "text-indigo-200"
                    }
                  >
                    {log.chainName}:{" "}
                    {log.outcome === "continued"
                      ? `next wing ${log.missionName} (${log.position}/${log.total}).`
                      : log.outcome === "completed"
                        ? `chain completed (${log.position}/${log.total}).`
                        : `chain stopped at ${log.missionName} (${log.position}/${log.total}).`}
                  </span>
                ) : log.type === "guild-renown" ? (
                  <span className="text-amber-300">{log.message}</span>
                ) : log.type === "calendar" ? (
                  <span className="text-indigo-200">{log.message}</span>
                ) : log.type === "pvp" ? (
                  <span className="text-orange-200">
                    {log.summary}
                    {log.honor > 0 ? ` +${log.honor} Honor` : ""}
                    {log.pvpReputation > 0
                      ? `, +${log.pvpReputation} PvP Reputation`
                      : ""}
                    .
                  </span>
                ) : log.type === "achievement" ? (
                  <span className="text-emerald-300">
                    Achievement unlocked: {log.label} (+{log.reward} Guild Renown)
                    {log.context ? ` (${log.context})` : ""}.
                  </span>
                ) : log.type === "gold" ? (
                  <span className="text-yellow-400">
                    Guild earned {log.amount} gold from {log.missionName}.
                  </span>
                ) : log.type === "zone-gold" ? (
                  <span className="text-yellow-400">
                    Guild earned {log.amount} gold from {log.missionName} ({log.checkpoint}% checkpoint).
                  </span>
                ) : log.type === "zone-clear" ? (
                  <span className="text-emerald-300">
                    <strong>{log.characterName}</strong> cleared {log.missionName}.
                  </span>
                ) : log.type === "key" ? (
                  <span className="text-amber-300">
                    <strong>{log.characterName}</strong> obtained{" "}
                    <span className="text-amber-100">[{log.keyLabel || log.keyId}]</span>{" "}
                    from {log.missionName}.
                  </span>
                ) : log.type === "loot-discard" ? (
                  <span className="text-gray-400">
                    {log.missionName}: {log.count} drop
                    {log.count === 1 ? "" : "s"} discarded (no eligible recipient).
                  </span>
                ) : log.type === "loot" && scenario === "raid" ? (
                  <span className="text-orange-100">
                    {log.bossName || log.missionName}: dropped{" "}
                    <span className={getQualityClass(log.itemQuality)}>
                      [{log.itemName}]
                    </span>
                    {" - "}
                    <strong>{log.characterName}</strong> received it
                    {typeof log.equipped === "boolean"
                      ? log.equipped
                        ? " and equipped it."
                        : " but kept their current item."
                      : "."}
                  </span>
                ) : (
                  <span>
                    <strong>{log.characterName}</strong> received{" "}
                    <span className={getQualityClass(log.itemQuality)}>
                      [{log.itemName}]
                    </span>{" "}
                    from {log.missionName}
                    {log.bossName ? ` (${log.bossName})` : ""}
                    {typeof log.equipped === "boolean"
                      ? log.equipped
                        ? " (equipped)."
                        : " (discarded)."
                      : "."}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
    </BaseModal>
  );
};

export default GuildLogModal;
