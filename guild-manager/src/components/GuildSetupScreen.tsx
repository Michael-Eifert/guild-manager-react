import React from "react";
import type { FormEvent } from "react";
import { Dices, HardDrive, Mars, Venus } from "lucide-react";
import IconButton from "./ui/IconButton";
import {
  DEFAULT_GUILD_SETUP,
  DB_CLASSES,
  FACTION_EMBLEM_ICON,
  GUILD_FACTION,
  GUILD_DUNGEON_ACTIVITY_OPTIONS,
  GUILD_SERVER_POPULATION,
  GUILD_SERVER_OPTIONS,
  REALM_DIFFICULTY_OPTIONS,
  normalizeRealmDifficulty,
} from "../constants";
import { PVP_ACTIVITY_FOCUS_OPTIONS } from "../pvp/battlefields/battlefieldDefinitions";
import type { GuildSetupState } from "../app/gameTypes";
import {
  DEFAULT_GAME_SETTINGS,
  REALM_GUILD_DENSITY_OPTIONS,
  REALM_GUILD_DYNAMICS_OPTIONS,
  normalizeGameSettings,
  type GameSettingsState,
} from "../settings/gameSettings";
import SegmentedControl from "./ui/SegmentedControl";
import {
  PERSONALITY_TRAIT_DEFINITIONS,
  type PersonalityTraitId,
} from "../game/characterPersonality";
import {
  getFounderOptionsForFaction,
  normalizeFounderConfig,
} from "../guildRelations/founderCreation";
import {
  LEADERSHIP_TRAIT_DEFINITIONS,
  type LeadershipTraitId,
} from "../guildRelations/guildRelations";
import {
  generateRandomCharacterName,
  generateRandomGuildName,
} from "../guild/nameGenerators";
import {
  getRealmAgeSummary,
  getStartingGuildProgressProfile,
  normalizeRealmAgeMonths,
  normalizeStartingGuildProgress,
  REALM_AGE_MONTHS,
  STARTING_GUILD_PROGRESS_PROFILES,
} from "../guild/startProgression";
import { getRacePortraitUrl, getRoleIcon, getWowIconUrl } from "../utils";
import {
  CONTENT_ROUTE_OPTIONS,
  getContentPhaseForRoute,
  normalizeContentRoute,
} from "../content/contentRules";

const GUILD_FOCUS_COPY = {
  Leveling: "Leveling (+5% Guild XP)",
  Dungeons: "Dungeons (+5% dungeon success)",
  Social: "Social (+5% mission gold with full squad)",
};

const getPopulationClassName = (population: string) =>
  population === GUILD_SERVER_POPULATION.HIGH
    ? "text-red-400"
    : "text-yellow-300";

const choiceButtonClass = (selected: boolean) =>
  `group flex min-w-0 flex-col items-center justify-center gap-2 rounded-lg border p-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
    selected
      ? "border-amber-400 bg-amber-950/55 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.14)]"
      : "border-gray-700 bg-gray-900/75 text-gray-300 hover:-translate-y-0.5 hover:border-amber-700 hover:bg-gray-800"
  }`;

const choiceIconClass =
  "h-16 w-16 rounded-md border border-black/60 object-cover shadow-lg transition-transform group-hover:scale-105";

const GuildSetupScreen = ({
  guildSetup,
  gameSettings = DEFAULT_GAME_SETTINGS,
  onChange,
  onGameSettingsChange,
  onStart,
  onLoadSession,
  onOpenBrowserSaves,
}: {
  guildSetup: GuildSetupState;
  gameSettings?: GameSettingsState;
  onChange: (field: string, value: unknown) => void;
  onGameSettingsChange?: (
    settings: Partial<GameSettingsState>,
  ) => void;
  onStart: () => void;
  onLoadSession: () => void;
  onOpenBrowserSaves?: () => void;
}) => {
  const guildName = String(guildSetup?.name || "");
  const faction = guildSetup?.faction || GUILD_FACTION.ALLIANCE;
  const contentRoute = normalizeContentRoute(guildSetup?.contentRoute);
  const contentPhase = getContentPhaseForRoute(contentRoute);
  const founder = normalizeFounderConfig(
    guildSetup?.founder,
    faction,
    contentPhase,
  );
  const founderOptions = getFounderOptionsForFaction(faction, contentPhase);
  const founderClasses =
    founderOptions.find((entry) => entry.race === founder.race)?.classes || [];
  const founderRoles =
    DB_CLASSES[founder.charClass as keyof typeof DB_CLASSES]?.allowedRoles ||
    ["DPS"];
  const canStart =
    guildName.trim().length > 0 && founder.name.trim().length > 0;
  const updateFounder = (changes: Record<string, unknown>) =>
    onChange(
      "founder",
      normalizeFounderConfig(
        { ...founder, ...changes },
        faction,
        contentPhase,
      ),
    );
  const selectedRealm =
    GUILD_SERVER_OPTIONS.find((option) => option.value === guildSetup?.server) ||
    GUILD_SERVER_OPTIONS[0];
  const selectedDungeonActivity =
    guildSetup?.dungeonActivity || DEFAULT_GUILD_SETUP.dungeonActivity;
  const selectedPvpActivityFocus =
    guildSetup?.pvpActivityFocus || DEFAULT_GUILD_SETUP.pvpActivityFocus;
  const selectedRealmDifficulty = normalizeRealmDifficulty(
    guildSetup?.realmDifficulty,
  );
  const selectedRealmAgeMonths = normalizeRealmAgeMonths(
    guildSetup?.realmAgeMonths,
  );
  const selectedStartingGuildProgress = normalizeStartingGuildProgress(
    guildSetup?.startingGuildProgress,
    selectedRealmAgeMonths,
  );
  const selectedStartingGuildProfile = getStartingGuildProgressProfile(
    selectedStartingGuildProgress,
  );
  const selectedStartingGuildIndex = STARTING_GUILD_PROGRESS_PROFILES.findIndex(
    (profile) => profile.id === selectedStartingGuildProgress,
  );
  const normalizedGameSettings = normalizeGameSettings(gameSettings);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canStart) onStart();
  };

  return (
    <div className="wow-shell min-h-screen w-full">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
        <form
          onSubmit={handleSubmit}
          className="wow-modal-panel bg-gray-900/95 border border-amber-800 rounded-lg shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-700 p-5 md:p-8">
            <div>
              <h1 className="fantasy-font text-2xl md:text-4xl text-amber-200">
                Found Your Guild
              </h1>
              <p className="text-sm md:text-base text-amber-100/80 mt-2">
                Set your guild identity before entering Azeroth.
              </p>
            </div>
            {onOpenBrowserSaves ? (
              <IconButton
                label="Load browser save"
                icon={<HardDrive size={20} aria-hidden="true" />}
                onClick={onOpenBrowserSaves}
                className="border-amber-700/80 bg-amber-950/35 text-amber-200 hover:border-amber-400 hover:bg-amber-900/50"
              />
            ) : null}
          </div>

          <div className="p-5 md:p-8 space-y-5">
            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Content Route
              </legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {CONTENT_ROUTE_OPTIONS.map((option) => {
                  const selected = contentRoute === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange("contentRoute", option.value)}
                      className={`${choiceButtonClass(selected)} items-start text-left`}
                    >
                      <span className="fantasy-font text-base text-amber-100">
                        {option.label}
                      </span>
                      <span className="text-xs leading-5 text-gray-400">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                Classic games can unlock the TBC Pre-Patch later. Activating it
                permanently commits this save to the Burning Crusade route.
              </p>
            </fieldset>

            <div className="block space-y-2">
              <label
                htmlFor="guild-name"
                className="block text-xs font-bold uppercase tracking-wider text-gray-300"
              >
                Name of Guild
              </label>
              <span className="relative block">
                <input
                  id="guild-name"
                  autoFocus
                  type="text"
                  value={guildName}
                  onChange={(event) => onChange("name", event.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-800 py-2 pl-3 pr-14 text-gray-100 focus:border-amber-500 focus:outline-none"
                  placeholder="Enter guild name"
                  maxLength={40}
                />
                <button
                  type="button"
                  aria-label="Randomize guild name"
                  title="Randomize guild name"
                  onClick={() =>
                    onChange(
                      "name",
                      generateRandomGuildName(faction, guildName),
                    )
                  }
                  className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r border-l border-gray-600 text-amber-200 transition-colors hover:bg-amber-950/45 hover:text-amber-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
                >
                  <Dices size={19} aria-hidden="true" />
                </button>
              </span>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Faction
              </legend>
              <div className="grid grid-cols-2 gap-3" role="radiogroup">
                {[
                  {
                    value: GUILD_FACTION.ALLIANCE,
                    banner: FACTION_EMBLEM_ICON[GUILD_FACTION.ALLIANCE],
                    accent:
                      "border-blue-400 bg-blue-950/45 text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.18)]",
                    hover:
                      "hover:border-blue-700 hover:bg-blue-950/25 hover:text-blue-100",
                  },
                  {
                    value: GUILD_FACTION.HORDE,
                    banner: FACTION_EMBLEM_ICON[GUILD_FACTION.HORDE],
                    accent:
                      "border-red-400 bg-red-950/45 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.18)]",
                    hover:
                      "hover:border-red-700 hover:bg-red-950/25 hover:text-red-100",
                  },
                ].map((option) => {
                  const selected = faction === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange("faction", option.value)}
                      className={`group relative min-h-[136px] overflow-hidden rounded-lg border p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
                        selected
                          ? option.accent
                          : `border-gray-700 bg-gray-800/65 text-gray-300 ${option.hover}`
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 top-0 h-12 opacity-30 ${
                          option.value === GUILD_FACTION.ALLIANCE
                            ? "bg-gradient-to-b from-blue-500/50 to-transparent"
                            : "bg-gradient-to-b from-red-500/50 to-transparent"
                        }`}
                      />
                      <img
                        src={getWowIconUrl(option.banner)}
                        alt=""
                        className="relative mx-auto h-20 w-16 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.7)] transition-transform group-hover:-translate-y-0.5"
                        onError={(event) => {
                          event.currentTarget.src = getWowIconUrl(
                            "inv_misc_questionmark",
                          );
                        }}
                      />
                      <span className="relative mt-1 block fantasy-font text-base font-bold tracking-wide">
                        {option.value}
                      </span>
                      <span className="sr-only">
                        {selected ? "Selected faction" : "Choose faction"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500">
                Choose your faction before creating the Guild Master.
              </p>
            </fieldset>

            <section className="space-y-5 rounded-lg border border-amber-800/60 bg-amber-950/15 p-4 md:p-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-200">
                  Founding Guild Master
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Create the leader around whom the first balanced dungeon group
                  will be formed.
                </div>
              </div>

              <div className="block space-y-2">
                <label
                  htmlFor="founder-name"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-400"
                >
                  Character Name
                </label>
                <span className="relative block">
                  <input
                    id="founder-name"
                    type="text"
                    value={founder.name}
                    onChange={(event) =>
                      updateFounder({ name: event.target.value })
                    }
                    className="w-full rounded border border-gray-600 bg-gray-900 py-2 pl-3 pr-14 text-gray-100 focus:border-amber-500 focus:outline-none"
                    placeholder="Enter guild master name"
                    maxLength={24}
                  />
                  <button
                    type="button"
                    aria-label="Randomize character name"
                    title="Randomize character name"
                    onClick={() =>
                      updateFounder({
                        name: generateRandomCharacterName(
                          founder.race,
                          founder.gender,
                          founder.name,
                        ),
                      })
                    }
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r border-l border-gray-600 text-amber-200 transition-colors hover:bg-amber-950/45 hover:text-amber-100 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
                  >
                    <Dices size={19} aria-hidden="true" />
                  </button>
                </span>
              </div>

              <fieldset className="space-y-2">
                <legend className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                  Race
                </legend>
                <div
                  className="flex flex-wrap justify-center gap-3"
                  role="radiogroup"
                  aria-label="Guild master race"
                >
                  {founderOptions.map((entry) => {
                    const selected = founder.race === entry.race;
                    return (
                      <button
                        key={entry.race}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          updateFounder({ race: entry.race, charClass: "" })
                        }
                        className={`${choiceButtonClass(selected)} w-[calc(50%-0.375rem)] sm:w-44`}
                      >
                        <img
                          src={getRacePortraitUrl(entry.race, founder.gender)}
                          alt=""
                          className={choiceIconClass}
                          onError={(event) => {
                            event.currentTarget.src = getWowIconUrl(
                              "inv_misc_questionmark",
                            );
                          }}
                        />
                        <span className="truncate text-xs font-bold">
                          {entry.race}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                  Gender
                </legend>
                <div
                  className="mx-auto grid max-w-sm grid-cols-2 gap-3"
                  role="radiogroup"
                  aria-label="Guild master gender"
                >
                  {(["Male", "Female"] as const).map((gender) => {
                    const selected = founder.gender === gender;
                    const GenderIcon = gender === "Male" ? Mars : Venus;
                    return (
                      <button
                        key={gender}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => updateFounder({ gender })}
                        className={choiceButtonClass(selected)}
                      >
                        <GenderIcon
                          size={31}
                          strokeWidth={2.25}
                          className={
                            gender === "Male"
                              ? "text-sky-300"
                              : "text-pink-300"
                          }
                          aria-hidden="true"
                        />
                        <span className="text-xs font-bold">{gender}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                  Class
                </legend>
                <div
                  className="flex flex-wrap justify-center gap-3"
                  role="radiogroup"
                  aria-label="Guild master class"
                >
                  {founderClasses.map((charClass) => {
                    const classData =
                      DB_CLASSES[charClass as keyof typeof DB_CLASSES];
                    const selected = founder.charClass === charClass;
                    return (
                      <button
                        key={charClass}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          updateFounder({ charClass, role: "" })
                        }
                        className={`${choiceButtonClass(selected)} w-[calc(50%-0.375rem)] sm:w-32`}
                      >
                        <img
                          src={classData?.icon}
                          alt=""
                          className={choiceIconClass}
                          onError={(event) => {
                            event.currentTarget.src = getWowIconUrl(
                              "inv_misc_questionmark",
                            );
                          }}
                        />
                        <span
                          className="truncate text-xs font-bold"
                          style={{ color: classData?.color }}
                        >
                          {charClass}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-400">
                  Role
                </legend>
                <div
                  className="mx-auto flex max-w-xl flex-wrap justify-center gap-3"
                  role="radiogroup"
                  aria-label="Guild master role"
                >
                  {founderRoles.map((role) => {
                    const selected = founder.role === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => updateFounder({ role })}
                        className={`${choiceButtonClass(selected)} w-[calc(50%-0.375rem)] sm:w-44`}
                      >
                        <span
                          className="flex h-16 w-16 items-center justify-center text-4xl drop-shadow-lg transition-transform group-hover:scale-110"
                          aria-hidden="true"
                        >
                          {getRoleIcon(role)}
                        </span>
                        <span className="text-xs font-bold">{role}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Gameplay Trait
                  </span>
                  <select
                    value={founder.personalityTrait}
                    onChange={(event) =>
                      updateFounder({ personalityTrait: event.target.value })
                    }
                    className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 focus:border-amber-500 focus:outline-none"
                  >
                    {Object.values(PERSONALITY_TRAIT_DEFINITIONS).map((trait) => (
                      <option key={trait.id} value={trait.id}>
                        {trait.name}
                      </option>
                    ))}
                  </select>
                  <span className="block text-[11px] text-slate-500">
                    {
                      PERSONALITY_TRAIT_DEFINITIONS[
                        founder.personalityTrait as PersonalityTraitId
                      ]?.description
                    }
                  </span>
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Leadership Trait
                  </span>
                  <select
                    value={founder.leadershipTrait}
                    onChange={(event) =>
                      updateFounder({ leadershipTrait: event.target.value })
                    }
                    className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 focus:border-amber-500 focus:outline-none"
                  >
                    {Object.values(LEADERSHIP_TRAIT_DEFINITIONS).map((trait) => (
                      <option key={trait.id} value={trait.id}>
                        {trait.name}
                      </option>
                    ))}
                  </select>
                  <span className="block text-[11px] text-slate-500">
                    {
                      LEADERSHIP_TRAIT_DEFINITIONS[
                        founder.leadershipTrait as LeadershipTraitId
                      ]?.description
                    }
                  </span>
                </label>
              </div>
            </section>

            <div className="space-y-3 rounded border border-gray-700 bg-gray-800/50 p-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                  Starting Activity
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Choose how active the guild should be after founding.
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                  Dungeon Groups
                </span>
                <select
                  value={selectedDungeonActivity}
                  onChange={(event) =>
                    onChange("dungeonActivity", event.target.value)
                  }
                  className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-500"
                >
                  {GUILD_DUNGEON_ACTIVITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                  PvP Activity
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PVP_ACTIVITY_FOCUS_OPTIONS.map((option) => {
                    const selected = option.value === selectedPvpActivityFocus;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange("pvpActivityFocus", option.value)}
                        aria-pressed={selected}
                        className={`rounded border px-2 py-2 text-xs font-bold transition-colors ${
                          selected
                            ? "border-emerald-500 bg-emerald-950/45 text-emerald-100"
                            : "border-gray-700 bg-gray-900 text-gray-300 hover:border-emerald-800 hover:bg-gray-800"
                        }`}
                        title={option.description}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-cyan-900/70 bg-cyan-950/15 p-4 transition-colors hover:border-cyan-700">
              <span>
                <span className="block text-sm font-bold text-cyan-100">
                  Play with Offline Simulation
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                  Characters follow individual online schedules. Offline
                  members cannot start activities, and quiet periods may
                  automatically fast-forward to the next login.
                </span>
              </span>
              <input
                type="checkbox"
                checked={normalizedGameSettings.offlineSimulationEnabled}
                onChange={(event) =>
                  onGameSettingsChange?.({
                    offlineSimulationEnabled: event.target.checked,
                  })
                }
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-600 bg-slate-950 accent-cyan-500"
              />
            </label>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-amber-900/70 bg-amber-950/15 p-4 transition-colors hover:border-amber-700">
              <span>
                <span className="block text-sm font-bold text-amber-100">
                  Officer Autonomy
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                  Appointed officers may accept free applications and manage
                  lower guild ranks. Detailed proposal controls remain available
                  in Guild Relations.
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-300">
                {normalizedGameSettings.officerAutonomyMode === "off"
                  ? "Off"
                  : "On"}
                <input
                  aria-label="Officer Autonomy"
                  type="checkbox"
                  checked={
                    normalizedGameSettings.officerAutonomyMode !== "off"
                  }
                  onChange={(event) =>
                    onGameSettingsChange?.({
                      officerAutonomyMode: event.target.checked
                        ? "automatic"
                        : "off",
                    })
                  }
                  className="h-5 w-5 rounded border-slate-600 bg-slate-950 accent-amber-500"
                />
              </span>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-amber-900/60 bg-amber-950/15 p-4">
                <span className="block text-sm font-bold text-amber-100">
                  Guild Density
                </span>
                <span className="mt-1 block min-h-10 text-xs leading-relaxed text-slate-400">
                  Sets how many NPC guilds the realm will gradually support.
                </span>
                <SegmentedControl
                  ariaLabel="Guild Density"
                  options={REALM_GUILD_DENSITY_OPTIONS}
                  value={normalizedGameSettings.realmGuildDensity}
                  onChange={(realmGuildDensity) =>
                    onGameSettingsChange?.({ realmGuildDensity })
                  }
                  className="mt-3"
                />
              </div>
              <div className="rounded-lg border border-violet-900/60 bg-violet-950/15 p-4">
                <span className="block text-sm font-bold text-violet-100">
                  Guild Dynamics
                </span>
                <span className="mt-1 block min-h-10 text-xs leading-relaxed text-slate-400">
                  Sets the pace of founding, mergers, disbands, and transfers.
                </span>
                <SegmentedControl
                  ariaLabel="Guild Dynamics"
                  options={REALM_GUILD_DYNAMICS_OPTIONS}
                  value={normalizedGameSettings.realmGuildDynamics}
                  onChange={(realmGuildDynamics) =>
                    onGameSettingsChange?.({ realmGuildDynamics })
                  }
                  tone="sky"
                  className="mt-3"
                />
              </div>
            </div>

            <div className="rounded-lg border border-cyan-900/70 bg-cyan-950/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-bold text-cyan-100">
                    Realm Age
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    Start on a fresh realm or enter an already established world.
                  </span>
                </span>
                <span className="rounded border border-cyan-800/70 bg-slate-950/70 px-3 py-1.5 text-right">
                  <span className="block text-sm font-bold text-cyan-100">
                    {selectedRealmAgeMonths === 0
                      ? "0 months"
                      : `${selectedRealmAgeMonths} month${
                          selectedRealmAgeMonths === 1 ? "" : "s"
                        }`}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-cyan-300/70">
                    {getRealmAgeSummary(selectedRealmAgeMonths)}
                  </span>
                </span>
              </div>
              <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <span>New</span>
                <input
                  aria-label="Realm Age"
                  type="range"
                  min={REALM_AGE_MONTHS.MIN}
                  max={REALM_AGE_MONTHS.MAX}
                  step="1"
                  value={selectedRealmAgeMonths}
                  onChange={(event) =>
                    onChange("realmAgeMonths", event.target.value)
                  }
                  className="w-full accent-cyan-500"
                />
                <span>12 mo.</span>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-900/70 bg-emerald-950/15 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-bold text-emerald-100">
                    Starting Guild Progress
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                    Older realms unlock stronger starts. Your guild always remains
                    behind the realm.
                  </span>
                </span>
                <span className="rounded border border-emerald-800/70 bg-slate-950/70 px-3 py-1.5 text-sm font-bold text-emerald-100">
                  {selectedStartingGuildProfile.label}
                </span>
              </div>
              <input
                aria-label="Starting Guild Progress"
                type="range"
                min="0"
                max={STARTING_GUILD_PROGRESS_PROFILES.length - 1}
                step="1"
                value={selectedStartingGuildIndex}
                onChange={(event) => {
                  const profile =
                    STARTING_GUILD_PROGRESS_PROFILES[
                      Number(event.target.value)
                    ];
                  if (
                    profile &&
                    profile.requiredRealmAgeMonths <= selectedRealmAgeMonths
                  ) {
                    onChange("startingGuildProgress", profile.id);
                  }
                }}
                className="mt-4 w-full accent-emerald-500"
              />
              <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-7">
                {STARTING_GUILD_PROGRESS_PROFILES.map((profile) => {
                  const available =
                    profile.requiredRealmAgeMonths <= selectedRealmAgeMonths;
                  const selected = profile.id === selectedStartingGuildProgress;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      disabled={!available}
                      onClick={() =>
                        onChange("startingGuildProgress", profile.id)
                      }
                      title={
                        available
                          ? profile.description
                          : `Requires a realm age of ${profile.requiredRealmAgeMonths} months.`
                      }
                      className={`rounded border px-1 py-2 text-[9px] font-bold uppercase leading-tight transition-colors ${
                        selected
                          ? "border-emerald-400 bg-emerald-950/65 text-emerald-100"
                          : available
                            ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-700"
                            : "cursor-not-allowed border-slate-800 bg-slate-950/50 text-slate-600"
                      }`}
                    >
                      {profile.shortLabel}
                      <span className="mt-1 block text-[8px] font-normal normal-case text-slate-500">
                        {profile.requiredRealmAgeMonths === 0
                          ? "Always"
                          : `${profile.requiredRealmAgeMonths}+ mo.`}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {selectedStartingGuildProfile.description} Guild master level:{" "}
                <span className="font-bold text-emerald-200">
                  {selectedStartingGuildProfile.founderLevel}
                </span>
                .
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                Guild Focus
              </span>
              <select
                value={guildSetup?.focus || "Leveling"}
                onChange={(event) => onChange("focus", event.target.value)}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-500"
              >
                {Object.entries(GUILD_FOCUS_COPY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                  Realm
                </span>
                <span className="text-[11px] uppercase tracking-wide text-gray-500">
                  Choose one
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GUILD_SERVER_OPTIONS.map((option) => {
                  const selected = option.value === selectedRealm.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange("server", option.value)}
                      aria-pressed={selected}
                      className={`min-h-[112px] rounded border p-3 text-left transition-colors ${
                        selected
                          ? "border-amber-400 bg-amber-950/35 shadow-[0_0_0_1px_rgba(251,191,36,0.28)]"
                          : "border-gray-700 bg-gray-800/65 hover:border-amber-700 hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-bold text-amber-100">
                            {option.value}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            Realm Type:{" "}
                            <span className="font-bold text-gray-200">
                              {option.style}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded border px-2 py-1 text-[10px] font-bold uppercase ${
                            selected
                              ? "border-amber-400/70 bg-amber-900/30 text-amber-100"
                              : "border-gray-600 bg-gray-900/70 text-gray-300"
                          }`}
                        >
                          {selected ? "Selected" : "Select"}
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                            Population
                          </div>
                          <div
                            className={`text-sm font-bold ${getPopulationClassName(
                              option.population,
                            )}`}
                          >
                            {option.population}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-gray-500">
                          {option.style === "PvP"
                            ? "Open world conflict"
                            : "Adventure focus"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                  Realm Competition
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Sets how quickly rival guilds level, gear, and progress through PvE.
                  This choice is fixed for the session.
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {REALM_DIFFICULTY_OPTIONS.map((option) => {
                  const selected = option.value === selectedRealmDifficulty;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange("realmDifficulty", option.value)}
                      aria-pressed={selected}
                      className={`rounded border p-3 text-left transition-colors ${
                        selected
                          ? "border-amber-400 bg-amber-950/35 text-amber-100"
                          : "border-gray-700 bg-gray-800/65 text-gray-300 hover:border-amber-700"
                      }`}
                    >
                      <div className="text-sm font-bold">{option.label}</div>
                      <div className="mt-1 text-xs text-gray-400">
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded border border-gray-700 bg-gray-800/60 p-3 text-xs text-gray-300">
              <div>Default faction: {GUILD_FACTION.ALLIANCE} (can be changed)</div>
              <div>Default focus: Leveling</div>
              <div>
                Starting activity: {selectedDungeonActivity}, PvP{" "}
                {
                  PVP_ACTIVITY_FOCUS_OPTIONS.find(
                    (option) => option.value === selectedPvpActivityFocus,
                  )?.label
                }
              </div>
              <div>
                Selected realm: {selectedRealm.value} ({selectedRealm.style}) -{" "}
                Population:{" "}
                <span
                  className={`font-bold ${getPopulationClassName(
                    selectedRealm.population,
                  )}`}
                >
                  {selectedRealm.population}
                </span>
              </div>
              <div>Realm competition: {selectedRealmDifficulty}</div>
              <div>Starting resources: 5 heroes and 5 gold</div>
              <div className="text-gray-400 mt-1">You can expand this setup later.</div>
            </div>
          </div>

          <div className="p-5 md:p-8 border-t border-gray-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onLoadSession}
              className="px-4 py-2 rounded border border-teal-800 bg-gray-800 text-teal-200 hover:bg-gray-700 text-sm font-bold"
            >
              Load Session
            </button>
            <button
              type="submit"
              disabled={!canStart}
              className="px-6 py-2 rounded border border-amber-700 bg-amber-900/40 text-amber-100 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuildSetupScreen;
