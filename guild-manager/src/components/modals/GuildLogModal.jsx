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
                {log.type === "gold" ? (
                  <span className="text-yellow-400">
                    Guild earned {log.amount} gold from {log.missionName}.
                  </span>
                ) : (
                  <span>
                    <strong>{log.characterName}</strong> received{" "}
                    <span className={getQualityClass(log.itemQuality)}>
                      [{log.itemName}]
                    </span>{" "}
                    from {log.missionName}.
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
