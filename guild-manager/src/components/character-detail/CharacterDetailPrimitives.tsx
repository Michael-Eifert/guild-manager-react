import {
  formatItemStats,
  getItemEffectiveLevel,
  getItemIconUrl,
  getQualityColor,
  getWowIconUrl,
} from "../../utils";
import type { ItemDefinition } from "../../types/itemTypes";

export const ARMORY_LEFT_SLOTS = Object.freeze([
  "head", "neck", "shoulder", "back", "chest", "wrist",
]);
export const ARMORY_RIGHT_SLOTS = Object.freeze([
  "hands", "belt", "legs", "feet", "ring", "trinket",
]);
export const ARMORY_BOTTOM_SLOTS = Object.freeze(["mainHand"]);

const formatPreferenceTag = (tag: string) =>
  String(tag || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const PreferencePills = ({
  values,
  tone = "emerald",
}: {
  values?: string[];
  tone?: "emerald" | "red";
}) => {
  const entries = (Array.isArray(values) ? values : []).filter(Boolean);
  if (entries.length === 0) {
    return <span className="text-xs text-gray-500 italic">None</span>;
  }
  const toneClass = tone === "red"
    ? "border-red-800 bg-red-950/25 text-red-100"
    : "border-emerald-800 bg-emerald-950/25 text-emerald-100";
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry) => (
        <span key={entry} className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${toneClass}`}>
          {formatPreferenceTag(entry)}
        </span>
      ))}
    </div>
  );
};

const formatEquipmentSlotLabel = (slotName: string) =>
  String(slotName || "")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const ArmoryItemSlot = ({
  slotName,
  item,
  align = "left",
}: {
  slotName: string;
  item?: ItemDefinition | null;
  align?: "left" | "right";
}) => {
  const borderColor = item ? getQualityColor(item.quality) : "#444";
  const itemStats = formatItemStats(item?.stats);
  const itemLevel = getItemEffectiveLevel(item);
  const setName = String(item?.setName || "").trim();
  const icon = (
    <div className="h-12 w-12 flex-none rounded-md border bg-black/50 p-0.5 shadow-inner" style={{ borderColor }}>
      <img
        src={getItemIconUrl(item, slotName)}
        alt={item ? item.name : slotName}
        className="h-full w-full rounded object-cover"
        onError={(event) => { event.currentTarget.src = getWowIconUrl("inv_misc_questionmark"); }}
      />
    </div>
  );
  const textAlignClass = align === "right" ? "items-end text-right" : "items-start";
  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-md border border-gray-800 bg-gray-950/35 px-3 py-2 shadow-sm transition-colors hover:border-amber-900/70 hover:bg-gray-900/70">
      {align !== "right" && icon}
      <div className={`flex min-w-0 flex-1 flex-col ${textAlignClass}`}>
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">{formatEquipmentSlotLabel(slotName)}</div>
        <div className={`max-w-full truncate text-sm font-bold ${!item ? "text-gray-600 italic" : ""}`} style={{ color: item ? borderColor : undefined }}>
          {item ? item.name : "Empty"}
        </div>
        <div className="text-[10px] text-amber-200/70">iLvl {itemLevel}</div>
        {setName && <div className="mt-0.5 inline-flex max-w-full items-center rounded border border-emerald-800 bg-emerald-950/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200"><span className="truncate">Set: {setName}</span></div>}
        {itemStats && <div className="max-w-full truncate text-[10px] text-emerald-300">{itemStats}</div>}
      </div>
      {align === "right" && icon}
    </div>
  );
};
