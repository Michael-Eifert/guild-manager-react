import React from "react";
import {
  DEFAULT_GUILD_SETUP,
  GUILD_FACTION,
  GUILD_DUNGEON_ACTIVITY_OPTIONS,
  GUILD_SERVER_POPULATION,
  GUILD_SERVER_OPTIONS,
} from "../constants";
import { PVP_ACTIVITY_FOCUS_OPTIONS } from "../pvp/battlefields/battlefieldDefinitions";

const GUILD_FOCUS_COPY = {
  Leveling: "Leveling (+5% Guild XP)",
  Dungeons: "Dungeons (+5% dungeon success)",
  Social: "Social (+5% mission gold with full squad)",
};

const getPopulationClassName = (population) =>
  population === GUILD_SERVER_POPULATION.HIGH
    ? "text-red-400"
    : "text-yellow-300";

const GuildSetupScreen = ({ guildSetup, onChange, onStart, onLoadSession }) => {
  const guildName = String(guildSetup?.name || "");
  const canStart = guildName.trim().length > 0;
  const selectedRealm =
    GUILD_SERVER_OPTIONS.find((option) => option.value === guildSetup?.server) ||
    GUILD_SERVER_OPTIONS[0];
  const selectedDungeonActivity =
    guildSetup?.dungeonActivity || DEFAULT_GUILD_SETUP.dungeonActivity;
  const selectedPvpActivityFocus =
    guildSetup?.pvpActivityFocus || DEFAULT_GUILD_SETUP.pvpActivityFocus;
  const handleSubmit = (event) => {
    event.preventDefault();
    if (canStart) onStart();
  };

  return (
    <div className="wow-shell min-h-screen w-full">
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8">
        <form
          onSubmit={handleSubmit}
          className="wow-modal-panel bg-gray-900/95 border border-amber-800 rounded-lg shadow-2xl"
        >
          <div className="p-5 md:p-8 border-b border-gray-700">
            <h1 className="fantasy-font text-2xl md:text-4xl text-amber-200">
              Found Your Guild
            </h1>
            <p className="text-sm md:text-base text-amber-100/80 mt-2">
              Set your guild identity before entering Azeroth.
            </p>
          </div>

          <div className="p-5 md:p-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                Name of Guild
              </span>
              <input
                autoFocus
                type="text"
                value={guildName}
                onChange={(event) => onChange("name", event.target.value)}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-500"
                placeholder="Enter guild name"
                maxLength={40}
              />
            </label>

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

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                Faction
              </span>
              <select
                value={guildSetup?.faction || GUILD_FACTION.ALLIANCE}
                onChange={(event) => onChange("faction", event.target.value)}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-500"
              >
                <option value={GUILD_FACTION.ALLIANCE}>{GUILD_FACTION.ALLIANCE}</option>
                <option value={GUILD_FACTION.HORDE}>{GUILD_FACTION.HORDE}</option>
              </select>
            </label>

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
