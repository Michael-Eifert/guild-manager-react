import { useEffect, useState } from "react";
import { CONFIG, DB_CLASSES } from "../constants";
import {
  getCharacterAverageItemLevel,
  getRacePortraitUrl,
  getRoleIcon,
  getWowIconUrl,
} from "../utils";
import { ensureCharacterPvpData } from "../pvp/pvpCharacterUtils";
import type { Character } from "../types/characterTypes";

type CharacterCardCharacter = Character & {
  charClass: string;
  level: number;
  exp: number;
  maxExp: number;
  lastLevelUp: number;
  race: string;
  gender: string;
  onlineStatus?: "Online" | "Offline" | "On Mission";
  onlineProfile?: string;
};

type CharacterCardProps = {
  char: CharacterCardCharacter;
  onClick: (character: CharacterCardCharacter) => void;
};

const CharacterCard = ({ char, onClick }: CharacterCardProps) => {
  const [now, setNow] = useState(() => Date.now());
  const classData = (DB_CLASSES as Record<string, {
    color: string;
    icon?: string;
  }>)[char.charClass];

  useEffect(() => {
    if (!char.lastLevelUp) return undefined;
    const remainingMs = Math.max(0, 1000 - (Date.now() - char.lastLevelUp));
    if (remainingMs <= 0) {
      setNow(Date.now());
      return undefined;
    }
    setNow(Date.now());
    const timerId = window.setTimeout(() => setNow(Date.now()), remainingMs);
    return () => window.clearTimeout(timerId);
  }, [char.lastLevelUp]);

  if (!classData) return null;

  const isMax = char.level >= CONFIG.LEVEL_CAP;
  const pct = Math.min(100, (char.exp / char.maxExp) * 100);
  const isFlashing = now - char.lastLevelUp < 1000;
  const avgItemLevel = getCharacterAverageItemLevel(char);
  const pvp = ensureCharacterPvpData(char).pvp;

  return (
    <div
      onClick={() => onClick(char)}
      className={`wow-card relative h-full bg-gray-800 border p-4 rounded-lg cursor-pointer transition-all active:scale-95 hover:-translate-y-1 hover:shadow-lg hover:border-yellow-500 ${char.status === "Questing" ? "border-blue-500 opacity-80" : "border-gray-600"} ${isFlashing ? "animate-levelup" : ""}`}
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
        <div className="text-right flex-none shrink-0 min-w-[118px]">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-700 bg-black/30">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Lvl</span>
            <span className={`text-xl leading-none font-extrabold ${isMax ? "text-yellow-400" : "text-gray-100"}`}>
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
        <div className="flex items-center gap-2">
          {char.onlineStatus ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                char.onlineStatus === "Offline"
                  ? "border-slate-700 text-slate-400"
                  : char.onlineStatus === "On Mission"
                    ? "border-blue-700 text-blue-300"
                    : "border-emerald-700 text-emerald-300"
              }`}
            >
              {char.onlineStatus}
            </span>
          ) : null}
          {char.onlineProfile ? (
            <span className="text-[10px] text-slate-500">
              {char.onlineProfile}
            </span>
          ) : null}
        </div>
        <div className="mt-1 truncate text-xs italic text-blue-300">
          {char.statusText}
        </div>
      </div>
      {pvp.rank > 0 && (
        <div className="mb-2 truncate text-[11px] font-semibold text-orange-200">
          PvP: {pvp.title} R{pvp.rank}
        </div>
      )}

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
