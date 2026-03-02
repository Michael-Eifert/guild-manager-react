import { getQualityClass } from "../../utils";
import BaseModal from "./BaseModal";

const GuildLogModal = ({ isOpen, onClose, logs }) => {
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
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic text-center py-10">No events yet.</div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
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
                ) : log.type === "achievement" ? (
                  <span className="text-emerald-300">
                    Achievement unlocked: {log.label} (+{log.reward} Guild Renown)
                    {log.context ? ` (${log.context})` : ""}.
                  </span>
                ) : log.type === "gold" ? (
                  <span className="text-yellow-400">
                    Guild earned {log.amount} gold from {log.missionName}.
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
