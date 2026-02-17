import { CONFIG, DB_CLASSES } from "../constants";
import {
  getCharacterAverageItemLevel,
  getItemIconUrl,
  getQualityColor,
  getRacePortraitUrl,
  getWowIconUrl,
} from "../utils";

const EQUIP_SLOT_ORDER = ["head", "chest", "legs", "feet", "hands", "mainHand"];

const CharacterEquipCheckCard = ({ char, onClick }) => {
  const classData = DB_CLASSES[char.charClass];
  if (!classData) return null;

  const avgItemLevel = getCharacterAverageItemLevel(char);
  const isMax = char.level >= CONFIG.LEVEL_CAP;

  return (
    <div
      onClick={() => onClick(char)}
      className={`wow-card relative bg-gray-800 border p-3 rounded-lg cursor-pointer transition-all active:scale-95 hover:-translate-y-0.5 hover:shadow-lg hover:border-yellow-500 ${char.status === "Questing" ? "border-blue-500 opacity-80" : "border-gray-600"}`}
    >
      {char.status === "Questing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 z-10 font-bold text-blue-300 tracking-wide rounded-lg pointer-events-none text-xs">
          MISSION
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <div className="font-bold text-base truncate" style={{ color: classData.color }}>
              {char.name}
            </div>
            <span className="text-sm text-gray-400">
              {char.gender === "Male" ? "♂️" : "♀️"}
            </span>
          </div>
          <div className="text-xs text-gray-300 mt-0.5 inline-flex items-center gap-1">
            <img
              src={getRacePortraitUrl(char.race, char.gender)}
              alt={`${char.race} ${char.gender}`}
              className="w-4 h-4 rounded-sm border border-gray-600 object-cover"
              onError={(event) => {
                event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
              }}
            />
            <span>{char.race}</span>
            <span className="text-gray-500">•</span>
            {classData.icon && (
              <img
                src={classData.icon}
                alt={char.charClass}
                className="w-4 h-4 rounded-sm border border-gray-600"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
            <span style={{ color: classData.color }}>{char.charClass}</span>
          </div>
        </div>

        <div className="text-right flex-none shrink-0 min-w-[118px]">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-700 bg-black/30">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Lvl</span>
            <span className={`text-lg leading-none font-extrabold ${isMax ? "text-yellow-400" : "text-gray-100"}`}>
              {char.level}
            </span>
          </div>
          <div className="mt-1">
            <span className="inline-flex text-xs px-2 py-1 rounded whitespace-nowrap border border-amber-700 bg-amber-950/35 text-amber-200 font-bold">
              iLvl {avgItemLevel.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {EQUIP_SLOT_ORDER.map((slot) => {
          const item = char.equipment?.[slot] || null;
          const borderColor = item ? getQualityColor(item.quality) : "var(--q-poor)";
          return (
            <div
              key={`${char.id}-${slot}`}
              className="w-10 h-10 rounded border bg-black/55 flex items-center justify-center"
              style={{ borderColor }}
              title={`${slot}: ${item?.name || "Empty"}`}
            >
              <img
                src={getItemIconUrl(item, slot)}
                alt={item?.name || slot}
                className="w-full h-full object-cover rounded"
                onError={(event) => {
                  event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CharacterEquipCheckCard;
