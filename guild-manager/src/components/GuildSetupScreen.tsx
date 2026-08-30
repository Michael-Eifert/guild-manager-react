import React from "react";
import type { FormEvent } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Dices,
  HardDrive,
  Mars,
  Venus,
} from "lucide-react";
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

type SetupStep = 0 | 1 | 2 | 3;

const SETUP_STEPS: Array<{
  id: SetupStep;
  label: string;
  shortLabel: string;
}> = [
  { id: 0, label: "Guild Destiny", shortLabel: "Destiny" },
  { id: 1, label: "Guild Master", shortLabel: "Master" },
  { id: 2, label: "Realm", shortLabel: "Realm" },
  { id: 3, label: "Gameplay", shortLabel: "Gameplay" },
];

const LAST_SETUP_STEP: SetupStep = 3;

const SetupPageHeading = ({
  eyebrow,
  title,
  description,
  headingRef,
}: {
  eyebrow: string;
  title: string;
  description: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) => (
  <header className="mb-6 border-b border-amber-900/45 pb-5">
    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400/70">
      {eyebrow}
    </p>
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="fantasy-font mt-2 text-2xl font-bold text-amber-100 outline-none md:text-3xl"
    >
      {title}
    </h2>
    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
      {description}
    </p>
  </header>
);

const SummaryEntry = ({
  label,
  value,
  missing = false,
}: {
  label: string;
  value: React.ReactNode;
  missing?: boolean;
}) => (
  <div className="min-w-0">
    <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
      {label}
    </dt>
    <dd
      className={`mt-0.5 truncate text-xs font-semibold ${
        missing ? "text-amber-300" : "text-slate-200"
      }`}
    >
      {value}
    </dd>
  </div>
);

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
  const selectedContentRoute =
    CONTENT_ROUTE_OPTIONS.find((option) => option.value === contentRoute) ||
    CONTENT_ROUTE_OPTIONS[0];
  const selectedPvpActivity = PVP_ACTIVITY_FOCUS_OPTIONS.find(
    (option) => option.value === selectedPvpActivityFocus,
  );
  const selectedGuildDensityLabel =
    REALM_GUILD_DENSITY_OPTIONS.find(
      (option) => option.value === normalizedGameSettings.realmGuildDensity,
    )?.label || normalizedGameSettings.realmGuildDensity;
  const selectedGuildDynamicsLabel =
    REALM_GUILD_DYNAMICS_OPTIONS.find(
      (option) => option.value === normalizedGameSettings.realmGuildDynamics,
    )?.label || normalizedGameSettings.realmGuildDynamics;
  const [activeStep, setActiveStep] = React.useState<SetupStep>(0);
  const [visitedSteps, setVisitedSteps] = React.useState<Set<SetupStep>>(
    () => new Set([0]),
  );
  const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const shouldFocusStepHeadingRef = React.useRef(false);
  const stepCompletion: Record<SetupStep, boolean> = {
    0: guildName.trim().length > 0,
    1: founder.name.trim().length > 0,
    2: true,
    3: true,
  };

  const goToStep = (step: SetupStep) => {
    shouldFocusStepHeadingRef.current = true;
    setVisitedSteps((current) => {
      const next = new Set(current);
      next.add(step);
      return next;
    });
    setActiveStep(step);
  };

  React.useEffect(() => {
    if (!shouldFocusStepHeadingRef.current) return;
    shouldFocusStepHeadingRef.current = false;
    stepHeadingRef.current?.focus();
  }, [activeStep]);

  const renderGuildFocus = () => (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
        Guild Focus
      </span>
      <select
        value={guildSetup?.focus || "Leveling"}
        onChange={(event) => onChange("focus", event.target.value)}
        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:border-amber-500 focus:outline-none"
      >
        {Object.entries(GUILD_FOCUS_COPY).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );

  const renderRealmSelection = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Realm
        </span>
        <span className="text-[11px] uppercase tracking-wide text-gray-500">
          Choose one
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
  );

  const renderRealmCompetition = () => (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-300">
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
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeStep < LAST_SETUP_STEP) {
      goToStep((activeStep + 1) as SetupStep);
      return;
    }
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

          <nav
            aria-label="Guild setup progress"
            className="border-b border-slate-700 bg-slate-950/35 px-3 py-4 md:px-8"
          >
            <ol className="grid grid-cols-4 gap-2">
              {SETUP_STEPS.map((step) => {
                const visited = visitedSteps.has(step.id);
                const complete = stepCompletion[step.id];
                const current = activeStep === step.id;
                const status = !visited
                  ? "Not visited"
                  : complete
                    ? "Complete"
                    : "Needs attention";
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      aria-current={current ? "step" : undefined}
                      aria-label={`${step.label}: ${status}`}
                      data-step-status={
                        !visited
                          ? "unvisited"
                          : complete
                            ? "complete"
                            : "incomplete"
                      }
                      onClick={() => goToStep(step.id)}
                      className={`group flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                        current
                          ? "border-amber-400 bg-amber-950/55 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.14)]"
                          : !visited
                            ? "border-slate-800 bg-slate-950/50 text-slate-600 hover:border-slate-600 hover:text-slate-400"
                            : complete
                              ? "border-emerald-900/80 bg-emerald-950/20 text-emerald-300 hover:border-emerald-700"
                              : "border-orange-900/80 bg-orange-950/20 text-orange-300 hover:border-orange-700"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] font-extrabold ${
                          current
                            ? "border-amber-300 bg-amber-500 text-slate-950"
                            : !visited
                              ? "border-slate-700 bg-slate-900 text-slate-600"
                              : complete
                                ? "border-emerald-600 bg-emerald-950 text-emerald-300"
                                : "border-orange-700 bg-orange-950 text-orange-300"
                        }`}
                      >
                        {visited && complete ? (
                          <Check size={14} aria-hidden="true" />
                        ) : visited && !complete ? (
                          <CircleAlert size={14} aria-hidden="true" />
                        ) : (
                          step.id + 1
                        )}
                      </span>
                      <span className="hidden text-[10px] font-bold uppercase tracking-wide sm:block">
                        {step.label}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wide sm:hidden">
                        {step.shortLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div
            key={activeStep}
            className="setup-wizard-page space-y-5 p-5 motion-reduce:animate-none md:p-8"
          >
            {activeStep === 0 ? (
              <section aria-label="Guild Destiny" className="space-y-5">
                <SetupPageHeading
                  eyebrow="Step 1 of 4"
                  title="Choose the Destiny of Your Guild"
                  description="Name your guild, choose its allegiance, and decide which path through Azeroth it will follow."
                  headingRef={stepHeadingRef}
                />
            <fieldset className="space-y-3">
              <legend className="fantasy-font text-lg font-bold text-amber-100">
                What Experience Do You Choose?
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

                {renderGuildFocus()}
              </section>
            ) : null}

            {activeStep === 1 ? (
              <section aria-label="Founding Guild Master" className="space-y-5">
                <SetupPageHeading
                  eyebrow="Step 2 of 4"
                  title="Founding Guild Master"
                  description="Create the leader around whom your first balanced dungeon group and guild story will be formed."
                  headingRef={stepHeadingRef}
                />

            <section className="space-y-5 rounded-lg border border-amber-800/60 bg-amber-950/15 p-4 md:p-6">
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

              </section>
            ) : null}

            {activeStep === 3 ? (
              <section aria-label="Gameplay Settings" className="space-y-5">
                <SetupPageHeading
                  eyebrow="Step 4 of 4"
                  title="Gameplay Settings"
                  description="Decide how active, autonomous, and dynamic your guild and the surrounding realm should feel."
                  headingRef={stepHeadingRef}
                />

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

              </section>
            ) : null}

            {activeStep === 2 ? (
              <section aria-label="Choose Your Realm" className="space-y-5">
                <SetupPageHeading
                  eyebrow="Step 3 of 4"
                  title="Choose Your Realm"
                  description="Select the world your guild will inhabit and decide how established and competitive that world already is."
                  headingRef={stepHeadingRef}
                />

                {renderRealmSelection()}
                {renderRealmCompetition()}

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
              </section>
            ) : null}
          </div>

          <section
            aria-labelledby="setup-summary-title"
            className="border-t border-amber-900/45 bg-slate-950/40 p-5 md:p-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/65">
                  Your choices
                </p>
                <h2
                  id="setup-summary-title"
                  className="fantasy-font mt-1 text-lg font-bold text-amber-100"
                >
                  Your Chronicle So Far
                </h2>
              </div>
              {!canStart ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-800 bg-orange-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-300">
                  <CircleAlert size={13} aria-hidden="true" />
                  Names still required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  <Check size={13} aria-hidden="true" />
                  Ready to found
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-lg border border-amber-900/55 bg-amber-950/10 p-3">
                <h3 className="fantasy-font text-sm font-bold text-amber-200">
                  Destiny
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  <SummaryEntry label="Experience" value={selectedContentRoute.label} />
                  <SummaryEntry
                    label="Guild"
                    value={guildName.trim() || "Not chosen yet"}
                    missing={!guildName.trim()}
                  />
                  <SummaryEntry label="Faction" value={faction} />
                  <SummaryEntry label="Focus" value={guildSetup?.focus || "Leveling"} />
                </dl>
              </article>

              <article className="rounded-lg border border-violet-900/55 bg-violet-950/10 p-3">
                <h3 className="fantasy-font text-sm font-bold text-violet-200">
                  Guild Master
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  <SummaryEntry
                    label="Name"
                    value={founder.name.trim() || "Not chosen yet"}
                    missing={!founder.name.trim()}
                  />
                  <SummaryEntry label="Identity" value={`${founder.gender} ${founder.race}`} />
                  <SummaryEntry label="Class" value={founder.charClass} />
                  <SummaryEntry label="Role" value={founder.role} />
                  <SummaryEntry
                    label="Gameplay Trait"
                    value={PERSONALITY_TRAIT_DEFINITIONS[founder.personalityTrait as PersonalityTraitId]?.name || founder.personalityTrait}
                  />
                  <SummaryEntry
                    label="Leadership"
                    value={LEADERSHIP_TRAIT_DEFINITIONS[founder.leadershipTrait as LeadershipTraitId]?.name || founder.leadershipTrait}
                  />
                </dl>
              </article>

              <article className="rounded-lg border border-cyan-900/55 bg-cyan-950/10 p-3">
                <h3 className="fantasy-font text-sm font-bold text-cyan-200">
                  Realm
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  <SummaryEntry label="Realm" value={selectedRealm.value} />
                  <SummaryEntry label="Type" value={`${selectedRealm.style} · ${selectedRealm.population}`} />
                  <SummaryEntry label="Competition" value={selectedRealmDifficulty} />
                  <SummaryEntry label="Age" value={`${selectedRealmAgeMonths} months`} />
                  <SummaryEntry label="Guild Start" value={selectedStartingGuildProfile.label} />
                </dl>
              </article>

              <article className="rounded-lg border border-emerald-900/55 bg-emerald-950/10 p-3">
                <h3 className="fantasy-font text-sm font-bold text-emerald-200">
                  Gameplay
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                  <SummaryEntry label="Dungeons" value={selectedDungeonActivity} />
                  <SummaryEntry label="PvP" value={selectedPvpActivity?.label || selectedPvpActivityFocus} />
                  <SummaryEntry
                    label="Offline Sim"
                    value={normalizedGameSettings.offlineSimulationEnabled ? "On" : "Off"}
                  />
                  <SummaryEntry
                    label="Officers"
                    value={normalizedGameSettings.officerAutonomyMode === "off" ? "Off" : "On"}
                  />
                  <SummaryEntry label="Guild Density" value={selectedGuildDensityLabel} />
                  <SummaryEntry label="Guild Dynamics" value={selectedGuildDynamicsLabel} />
                </dl>
              </article>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-gray-700 p-5 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <button
              type="button"
              onClick={onLoadSession}
              className="min-h-11 rounded border border-teal-800 bg-gray-800 px-4 py-2 text-sm font-bold text-teal-200 transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              Load Session
            </button>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() => goToStep((activeStep - 1) as SetupStep)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 transition-colors hover:border-slate-400 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={17} aria-hidden="true" />
                Back
              </button>
              <button
                type="submit"
                disabled={activeStep === LAST_SETUP_STEP && !canStart}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-amber-600 bg-gradient-to-b from-amber-700 to-amber-950 px-5 py-2 text-sm font-bold text-amber-50 shadow-lg shadow-amber-950/25 transition hover:border-amber-300 hover:from-amber-600 hover:to-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {activeStep === LAST_SETUP_STEP ? "Found Guild" : "Continue"}
                {activeStep < LAST_SETUP_STEP ? (
                  <ChevronRight size={17} aria-hidden="true" />
                ) : (
                  <Check size={17} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuildSetupScreen;
