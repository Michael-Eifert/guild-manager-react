import { CONFIG, DB_CLASSES } from "../constants";
import {
  getCharacterAverageItemLevel,
  getRacePortraitUrl,
  getRoleIcon,
  getWowIconUrl,
} from "../utils";

const CharacterCard = ({ char, onClick }) => {
  const classData = DB_CLASSES[char.charClass];
  if (!classData) return null;

  const isMax = char.level >= CONFIG.LEVEL_CAP;
  const pct = Math.min(100, (char.exp / char.maxExp) * 100);
  const isFlashing = Date.now() - char.lastLevelUp < 1000;
  const avgItemLevel = getCharacterAverageItemLevel(char);

  return (
    <div
      onClick={() => onClick(char)}
      className={`wow-card relative bg-gray-800 border p-4 rounded-lg cursor-pointer transition-all active:scale-95 hover:-translate-y-1 hover:shadow-lg hover:border-yellow-500 ${char.status === "Questing" ? "border-blue-500 opacity-80" : "border-gray-600"} ${isFlashing ? "animate-levelup" : ""}`}
    >
      {char.status === "Questing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 font-bold text-blue-400 tracking-widest rounded-lg pointer-events-none">
          MISSION
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1 min-w-0">
          <div
            className="font-bold text-lg truncate"
            style={{ color: classData.color }}
          >
            {char.name}
          </div>
          <span className="text-sm text-gray-500">
            {char.gender === "Male" ? "♂️" : "♀️"}
          </span>
        </div>
        <div className="text-xs bg-black/40 px-2 py-1 rounded whitespace-nowrap">
          {isMax ? (
            <span className="text-yellow-500 font-bold">MAX</span>
          ) : (
            `Lvl ${char.level}`
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
        <span className="font-bold text-gray-300 uppercase text-xs inline-flex items-center gap-1">
          <img
            src={getRacePortraitUrl(char.race, char.gender)}
            alt={`${char.race} ${char.gender}`}
            className="w-4 h-4 rounded-sm border border-gray-600 object-cover"
            onError={(event) => {
              event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
            }}
          />
          {char.race}
        </span>
        <span className="opacity-50">|</span>
        <span className="inline-flex items-center gap-1" style={{ color: classData.color }}>
          {classData.icon && (
            <img
              src={classData.icon}
              alt={char.charClass}
              className="w-4 h-4 rounded-sm border border-gray-600"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          {char.charClass}
        </span>
        <span className="opacity-50">|</span>
        <span className="text-white">{getRoleIcon(char.role)}</span>
      </div>

      <div className="mb-2">
        <div className="text-xs text-blue-300 italic truncate">{char.statusText}</div>
      </div>
      <div className="text-[11px] text-amber-200/80 font-semibold mb-1">
        Avg iLvl: {avgItemLevel.toFixed(1)}
      </div>

      {!isMax ? (
        <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          ></div>
        </div>
      ) : (
        <div className="h-1.5 mt-2 border-t border-yellow-900/50"></div>
      )}
    </div>
  );
};

export default CharacterCard;
