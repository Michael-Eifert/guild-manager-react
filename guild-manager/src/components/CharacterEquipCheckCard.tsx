import { CONFIG, DB_CLASSES } from "../constants";
import {
  getCharacterAverageItemLevel,
  getItemEffectiveLevel,
  getItemIconUrl,
  getQualityColor,
  getRacePortraitUrl,
  getWowIconUrl,
  normalizeEquipmentSlots,
} from "../utils";
import type { Character } from "../types/characterTypes";
import type { ItemDefinition } from "../types/itemTypes";

type ClassPresentation = { color: string; icon?: string };
const CLASS_PRESENTATIONS = DB_CLASSES as Record<string, ClassPresentation>;

const ARMORY_LEFT_SLOTS = Object.freeze([
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
]);
const ARMORY_RIGHT_SLOTS = Object.freeze([
  "hands",
  "belt",
  "legs",
  "feet",
  "ring",
  "trinket",
]);

const formatSlotLabel = (slot: string) =>
  String(slot || "")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

function EquipSlotIcon({
  charId,
  slot,
  item,
}: {
  charId: string;
  slot: string;
  item?: ItemDefinition | null;
}) {
  const borderColor = item ? getQualityColor(item.quality) : "var(--q-poor)";
  const itemLevel = item ? getItemEffectiveLevel(item) : 0;

  return (
    <div
      key={`${charId}-${slot}`}
      className="relative h-10 w-10 rounded-md border bg-black/60 p-0.5 shadow-inner transition-transform hover:-translate-y-0.5 sm:h-11 sm:w-11"
      style={{ borderColor }}
      title={`${formatSlotLabel(slot)}: ${item?.name || "Empty"}${item ? ` - iLvl ${itemLevel}` : ""}`}
    >
      <img
        src={getItemIconUrl(item, slot)}
        alt={item?.name || slot}
        className={`h-full w-full rounded object-cover ${item ? "" : "opacity-45"}`}
        onError={(event) => {
          event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
        }}
      />
      {!item && (
        <span className="pointer-events-none absolute inset-0 rounded bg-black/25" />
      )}
    </div>
  );
}

const CharacterEquipCheckCard = ({
  char,
  onClick,
}: {
  char: Character;
  onClick: (character: Character) => void;
}) => {
  const classData = CLASS_PRESENTATIONS[char.charClass || ""];
  if (!classData) return null;

  const avgItemLevel = getCharacterAverageItemLevel(char);
  const isMax = Number(char.level) >= CONFIG.LEVEL_CAP;
  const equipment = normalizeEquipmentSlots(char.equipment) as Record<
    string,
    ItemDefinition | null | undefined
  >;
  const centerIcon = classData.icon || getRacePortraitUrl(char.race, char.gender);

  return (
    <div
      onClick={() => onClick(char)}
      className={`wow-card relative overflow-hidden bg-gray-800 border p-3.5 rounded-lg cursor-pointer transition-all active:scale-95 hover:-translate-y-0.5 hover:shadow-lg hover:border-yellow-500 ${char.status === "Questing" ? "border-blue-500/80 opacity-85" : "border-gray-600"}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-500/10 to-transparent" />
      <div className="flex items-start justify-between gap-3 mb-3">
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
          {char.status === "Questing" && (
            <div className="mt-1">
              <span className="inline-flex rounded border border-blue-500/60 bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Mission
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-amber-900/45 bg-black/25 p-3 shadow-inner">
        <div className="grid grid-cols-[auto_minmax(64px,1fr)_auto] items-center gap-3">
          <div className="grid grid-cols-2 gap-2">
            {ARMORY_LEFT_SLOTS.map((slot) => (
              <EquipSlotIcon
                key={`${char.id}-left-${slot}`}
                charId={char.id}
                slot={slot}
                item={equipment[slot]}
              />
            ))}
          </div>

          <div className="flex min-w-0 flex-col items-center justify-center gap-2 self-stretch rounded-md border border-slate-800/80 bg-slate-950/45 px-2 py-3">
            <div className="inline-flex items-center rounded-md border border-amber-500/80 bg-amber-950/45 px-3 py-1 text-sm font-extrabold leading-none text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.18)]">
              iLvl {avgItemLevel.toFixed(1)}
            </div>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border bg-black/55 p-1 shadow-[0_0_18px_rgba(245,158,11,0.14)]"
              style={{ borderColor: classData.color }}
            >
              <img
                src={centerIcon}
                alt={char.charClass}
                className="h-full w-full rounded-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
                }}
              />
            </div>
            <div className="max-w-full truncate text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {char.role || "DPS"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ARMORY_RIGHT_SLOTS.map((slot) => (
              <EquipSlotIcon
                key={`${char.id}-right-${slot}`}
                charId={char.id}
                slot={slot}
                item={equipment[slot]}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <EquipSlotIcon
            charId={char.id}
            slot="mainHand"
            item={equipment.mainHand}
          />
        </div>
      </div>
    </div>
  );
};

export default CharacterEquipCheckCard;
