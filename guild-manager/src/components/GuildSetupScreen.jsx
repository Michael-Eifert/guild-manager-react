import React from "react";
import {
  GUILD_FACTION,
  GUILD_SERVER,
  GUILD_SERVER_OPTIONS,
} from "../constants";

const GUILD_FOCUS_COPY = {
  Leveling: "Leveling (+5% Guild XP)",
  Dungeons: "Dungeons (+5% dungeon success)",
  Social: "Social (+5% mission gold with full squad)",
};

const GuildSetupScreen = ({ guildSetup, onChange, onStart, onLoadSession }) => {
  const guildName = String(guildSetup?.name || "");
  const canStart = guildName.trim().length > 0;
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

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
                Server
              </span>
              <select
                value={guildSetup?.server || GUILD_SERVER.EVERLOOK}
                onChange={(event) => onChange("server", event.target.value)}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:outline-none focus:border-amber-500"
              >
                {GUILD_SERVER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded border border-gray-700 bg-gray-800/60 p-3 text-xs text-gray-300">
              <div>Default faction: {GUILD_FACTION.ALLIANCE} (can be changed)</div>
              <div>Default focus: Leveling</div>
              <div>Default server: Everlook (PvE)</div>
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
