import BaseModal from "./BaseModal";

const DebugModal = ({ isOpen, onClose, onBulkLevel }) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/85 backdrop-blur-sm p-4"
      panelClassName="wow-modal-panel bg-gray-900 border-2 border-red-900 rounded-lg max-w-md w-full relative shadow-2xl"
    >
        <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-bold text-red-500 fantasy-font">Debug Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">
              Global Level Override
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onBulkLevel(1)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-green-400 font-bold text-sm"
              >
                +1 Level All
              </button>
              <button
                onClick={() => onBulkLevel(5)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-green-400 font-bold text-sm"
              >
                +5 Level All
              </button>
              <button
                onClick={() => onBulkLevel(-5)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-red-400 font-bold text-sm"
              >
                -5 Level All
              </button>
              <button
                onClick={() => onBulkLevel(-1)}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-red-400 font-bold text-sm"
              >
                -1 Level All
              </button>
            </div>
          </div>
        </div>
    </BaseModal>
  );
};

export default DebugModal;
