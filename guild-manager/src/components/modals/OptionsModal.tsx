import BaseModal from "./BaseModal";

const OptionsModal = ({
  isOpen,
  onClose,
  onSaveSession,
  onLoadSession,
  onOpenDebug,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: () => void;
  onLoadSession: () => void;
  onOpenDebug: () => void;
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/70 backdrop-blur-sm p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-2 border-gray-700 rounded-lg w-full max-w-sm shadow-2xl"
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-bold fantasy-font text-gray-100">Settings</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl px-1">
          &times;
        </button>
      </div>
      <div className="p-4 space-y-3">
        <button
          onClick={() => {
            onSaveSession();
            onClose();
          }}
          className="w-full px-4 py-3 rounded border border-emerald-800 bg-gray-800 text-emerald-200 hover:bg-gray-700 text-sm font-bold"
        >
          &#128190; Save Session
        </button>
        <button
          onClick={() => {
            onLoadSession();
            onClose();
          }}
          className="w-full px-4 py-3 rounded border border-teal-800 bg-gray-800 text-teal-200 hover:bg-gray-700 text-sm font-bold"
        >
          &#128193; Load Session
        </button>
        <button
          onClick={() => {
            onOpenDebug();
            onClose();
          }}
          className="w-full px-4 py-3 rounded border border-red-900 bg-gray-900 text-red-300 hover:bg-red-900/20 text-sm font-bold"
        >
          &#9881;&#65039; Debug Menu
        </button>
      </div>
    </BaseModal>
  );
};

export default OptionsModal;
