import { useMemo, useState } from "react";
import {
  getVisibleGuildLogEntries,
  type GuildLogFilter,
} from "../../guild/guildLog";
import { getQualityClass } from "../../utils";
import BaseModal from "./BaseModal";
import type { Mission } from "../../types/missionTypes";

type GuildLogEntry = {
  time?: string;
  type?: string;
  outcome?: string;
  missionName?: string;
  bossName?: string;
  bossesCleared?: number;
  totalBosses?: number;
  successChance?: number;
  failChance?: number;
  attemptsUsed?: number;
  maxAttempts?: number;
  attemptsRemaining?: number;
  amount?: number;
  wipeCount?: number;
  wipeCost?: number;
  unpaidAmount?: number;
  chainName?: string;
  position?: number;
  total?: number;
  message?: string;
  characterName?: string;
  quantity?: number;
  itemId?: string;
  summary?: string;
  honor?: number;
  pvpReputation?: number;
  label?: string;
  reward?: number;
  context?: string;
  checkpoint?: number;
  keyLabel?: string;
  keyId?: string;
  count?: number;
  itemQuality?: number;
  itemName?: string;
  equipped?: boolean;
  disposition?: "equipped" | "stored" | "sold";
  soldGold?: number;
};
type FilterCounts = Record<GuildLogFilter, number>;

const LOG_FILTERS: ReadonlyArray<{ id: GuildLogFilter; label: string }> = Object.freeze([
  { id: "all", label: "All" },
  { id: "world", label: "World" },
  { id: "dungeon", label: "Dungeon" },
  { id: "raid", label: "Raid" },
  { id: "pvp", label: "PvP" },
]);

const getLootDispositionText = (log: GuildLogEntry, parenthesized = false) => {
  const disposition =
    log.disposition ||
    (typeof log.equipped === "boolean"
      ? log.equipped
        ? "equipped"
        : "sold"
      : null);
  const text =
    disposition === "equipped"
      ? "Equipped"
      : disposition === "stored"
        ? "Stored for another loadout"
        : disposition === "sold"
          ? `Sold${log.soldGold ? ` for ${log.soldGold}g` : ""}`
          : "";
  if (!text) return ".";
  return parenthesized ? ` (${text}).` : ` — ${text}.`;
};

const GuildLogModal = ({
  isOpen,
  onClose,
  variant = "modal",
  logs,
  missionList = [],
  onClearLogs,
}: {
  isOpen: boolean;
  onClose?: () => void;
  variant?: "modal" | "page";
  logs: GuildLogEntry[];
  missionList?: Mission[];
  onClearLogs?: (filter: GuildLogFilter) => void;
}) => {
  const [activeFilter, setActiveFilter] = useState<GuildLogFilter>("all");
  const filterCounts = useMemo(
    () => {
      const counts: FilterCounts = {
        all: getVisibleGuildLogEntries(logs, missionList, "all").length,
        world: getVisibleGuildLogEntries(logs, missionList, "world").length,
        dungeon: getVisibleGuildLogEntries(logs, missionList, "dungeon").length,
        raid: getVisibleGuildLogEntries(logs, missionList, "raid").length,
        pvp: getVisibleGuildLogEntries(logs, missionList, "pvp").length,
      };
      return counts;
    },
    [logs, missionList],
  );
  const visibleLogs = useMemo(
    () => getVisibleGuildLogEntries(logs, missionList, activeFilter),
    [activeFilter, logs, missionList],
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      overlayClassName="bg-black/85 backdrop-blur-sm p-0 md:p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-x-0 border-y-0 md:border-2 border-gray-600 rounded-none md:rounded-lg w-full max-w-2xl h-full md:h-[80vh] flex flex-col relative shadow-2xl"
      pageClassName="wow-modal-panel min-h-[calc(100dvh-10rem)] w-full overflow-hidden rounded-xl border border-gray-600 bg-gray-900 shadow-2xl flex flex-col"
      ariaLabel="Guild Log"
    >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white fantasy-font">
            Guild Log
          </h2>
          {variant !== "page" && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white text-3xl px-2"
            >
              &times;
            </button>
          )}
        </div>
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-900/80">
          <div className="flex items-center justify-between gap-3">
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
            {onClearLogs && (
              <button
                type="button"
                onClick={() => onClearLogs(activeFilter)}
                disabled={visibleLogs.length === 0}
                title={`Clear ${
                  LOG_FILTERS.find((filter) => filter.id === activeFilter)?.label
                } log`}
                className="shrink-0 rounded border border-red-800 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-200 transition-colors hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Log
              </button>
            )}
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
                    {Number(log.unpaidAmount) > 0
                      ? ` Missing ${log.unpaidAmount}g.`
                      : ""}
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
                ) : log.type === "profession" || log.type === "profession-material" ? (
                  <span className="text-emerald-200">
                    {log.message ||
                      `${log.characterName || "Guild"} gathered ${log.quantity || 1} ${log.itemId || "material"}.`}
                  </span>
                ) : log.type === "calendar" ? (
                  <span className="text-indigo-200">{log.message}</span>
                ) : log.type === "pvp" ? (
                  <span className="text-orange-200">
                    {log.summary}
                    {Number(log.honor) > 0 ? ` +${log.honor} Honor` : ""}
                    {Number(log.pvpReputation) > 0
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
                    {getLootDispositionText(log)}
                  </span>
                ) : (
                  <span>
                    <strong>{log.characterName}</strong> received{" "}
                    <span className={getQualityClass(log.itemQuality)}>
                      [{log.itemName}]
                    </span>{" "}
                    from {log.missionName}
                    {log.bossName ? ` (${log.bossName})` : ""}
                    {getLootDispositionText(log, true)}
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
