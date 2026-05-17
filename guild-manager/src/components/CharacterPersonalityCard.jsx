import { DB_CLASSES } from "../constants";
import {
  getCharacterMorale,
  getMoraleLabel,
  getMoraleSuccessModifier,
} from "../game/characterMorale";
import {
  ZONE_COMPLETION_ARCHETYPE,
  getCharacterZonePreference,
} from "../zones/zoneDefinitions";
import { getRacePortraitUrl, getRoleIcon, getWowIconUrl } from "../utils";

const ZONE_ARCHETYPE_LABEL = Object.freeze({
  [ZONE_COMPLETION_ARCHETYPE.GEAR_SEEKER]: "Gear Seeker",
  [ZONE_COMPLETION_ARCHETYPE.COMPLETIONIST]: "Completionist",
  [ZONE_COMPLETION_ARCHETYPE.WANDERER]: "Wanderer",
  [ZONE_COMPLETION_ARCHETYPE.AVOIDANT]: "Cautious Pathfinder",
});

const ZONE_ARCHETYPE_BLURB = Object.freeze({
  [ZONE_COMPLETION_ARCHETYPE.GEAR_SEEKER]: "Chases high-end zones first.",
  [ZONE_COMPLETION_ARCHETYPE.COMPLETIONIST]: "Clears from low zones upward.",
  [ZONE_COMPLETION_ARCHETYPE.WANDERER]: "Follows favorite places and foes.",
  [ZONE_COMPLETION_ARCHETYPE.AVOIDANT]: "Avoids disliked regions when possible.",
});

const formatPreferenceTag = (tag) =>
  String(tag || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const PreferencePreview = ({ label, values, tone }) => {
  const entries = (Array.isArray(values) ? values : []).filter(Boolean).slice(0, 2);
  const toneClass =
    tone === "red"
      ? "border-red-800 bg-red-950/25 text-red-100"
      : "border-emerald-800 bg-emerald-950/25 text-emerald-100";

  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="flex min-h-[24px] flex-wrap gap-1">
        {entries.length === 0 ? (
          <span className="text-xs italic text-gray-500">None</span>
        ) : (
          entries.map((entry) => (
            <span
              key={entry}
              className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${toneClass}`}
            >
              {formatPreferenceTag(entry)}
            </span>
          ))
        )}
      </div>
    </div>
  );
};

const CharacterPersonalityCard = ({ char, onClick }) => {
  const classData = DB_CLASSES[char.charClass];
  if (!classData) return null;

  const zonePreference = getCharacterZonePreference(char);
  const archetypeLabel =
    ZONE_ARCHETYPE_LABEL[zonePreference.archetype] || "Adventurer";
  const archetypeBlurb =
    ZONE_ARCHETYPE_BLURB[zonePreference.archetype] ||
    "Follows their instincts through unfinished zones.";
  const morale = getCharacterMorale(char);
  const moraleLabel = getMoraleLabel(morale);
  const moraleModifier = getMoraleSuccessModifier(char);
  const moraleEffect =
    moraleModifier > 0
      ? `+${moraleModifier}% dungeon/raid`
      : moraleModifier < 0
        ? `${moraleModifier}% dungeon/raid`
        : "No dungeon/raid bonus";
  const moraleBarClass =
    morale <= 25
      ? "bg-red-500"
      : morale >= 75
        ? "bg-emerald-500"
        : "bg-cyan-500";

  return (
    <div
      onClick={() => onClick(char)}
      className={`wow-card relative cursor-pointer rounded-lg border bg-gray-800 p-3 transition-all active:scale-95 hover:-translate-y-0.5 hover:border-yellow-500 hover:shadow-lg ${char.status === "Questing" ? "border-blue-500 opacity-80" : "border-gray-600"}`}
    >
      {char.status === "Questing" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/55 text-xs font-bold tracking-wide text-blue-300">
          MISSION
        </div>
      )}

      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1">
            <div className="truncate text-base font-bold" style={{ color: classData.color }}>
              {char.name}
            </div>
            <span className="text-sm text-gray-400">
              {char.gender === "Male" ? "M" : "F"}
            </span>
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-300">
            <img
              src={getRacePortraitUrl(char.race, char.gender)}
              alt={`${char.race} ${char.gender}`}
              className="h-4 w-4 rounded-sm border border-gray-600 object-cover"
              onError={(event) => {
                event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
              }}
            />
            <span>{char.race}</span>
            <span className="text-gray-500">|</span>
            <span style={{ color: classData.color }}>{char.charClass}</span>
            <span className="text-white">{getRoleIcon(char.role)}</span>
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="text-[10px] font-bold uppercase tracking-wide text-purple-300">
            Archetype
          </div>
          <div className="text-sm font-bold text-white">{archetypeLabel}</div>
        </div>
      </div>

      <div className="rounded border border-purple-900/60 bg-purple-950/15 p-2">
        <div className="text-xs text-purple-100/80">{archetypeBlurb}</div>
      </div>

      <div className="mt-3 rounded border border-cyan-900/60 bg-cyan-950/15 p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">
              Morale
            </div>
            <div className="text-xs text-cyan-100/80">{moraleEffect}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-white">{morale}/100</div>
            <div className="text-[11px] font-semibold text-cyan-200">{moraleLabel}</div>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-cyan-900/60 bg-gray-950">
          <div className={`h-full ${moraleBarClass}`} style={{ width: `${morale}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <PreferencePreview label="Likes" values={zonePreference.likedBiomes} />
        <PreferencePreview
          label="Avoids"
          values={zonePreference.dislikedBiomes}
          tone="red"
        />
      </div>
    </div>
  );
};

export default CharacterPersonalityCard;
