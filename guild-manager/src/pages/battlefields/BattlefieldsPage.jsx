import React, { useEffect, useMemo, useState } from "react";

import { DB_CLASSES, GUILD_FACTION } from "../../constants";
import {
  BATTLEGROUND_BRACKETS,
  PVP_ACTIVITY_FOCUS_OPTIONS,
  WARSONG_GULCH,
} from "../../pvp/battlefields/battlefieldDefinitions";
import {
  calculateBattlefieldTeamProfile,
  ensureBattlefieldState,
  estimateBattlefieldWinChance,
  generateAggregateEnemyTeam,
  getBattlegroundBracketForLevel,
  getEligibleBattlegroundCharacters,
  getPvpActivityConfig,
  groupCharactersByBattlegroundBracket,
} from "../../pvp/battlefields/battlefieldUtils";
import {
  ensureWorldPvpState,
  getWorldPvpProfile,
  getWorldPvpRiskChance,
} from "../../pvp/worldPvpUtils";
import { getZoneById, ZONE_DEFINITIONS } from "../../zones/zoneDefinitions";
import { getRacePortraitUrl, getWowIconUrl } from "../../utils";

const getBattleResultLabel = (result) => {
  if (result === "victory") return "Victory";
  if (result === "defeat") return "Defeat";
  return "Draw";
};

const getBattleResultClass = (result) => {
  if (result === "victory") return "text-emerald-300";
  if (result === "defeat") return "text-red-300";
  return "text-amber-200";
};

const formatTimeRemaining = (battle, gameTimeMs) => {
  const remainingMs = Math.max(
    0,
    Number(battle?.finishTime || 0) - Math.max(0, Number(gameTimeMs) || 0),
  );
  return `${Math.ceil(remainingMs / 1000)}m`;
};

const CharacterPick = ({ member, selected, disabled, onToggle }) => {
  const charClass = member?.charClass || member?.class || "";
  const classInfo = DB_CLASSES?.[charClass] || {};
  const racePortraitUrl = getRacePortraitUrl(member?.race, member?.gender);
  const classIconUrl = classInfo.icon || getWowIconUrl("inv_misc_questionmark");

  return (
    <button
      type="button"
      onClick={() => onToggle(member.id)}
      disabled={disabled}
      className={`flex items-center gap-2 rounded border p-2 text-left transition ${
        selected
          ? "border-yellow-400 bg-yellow-500/15 text-yellow-50"
          : "border-slate-700 bg-slate-950/70 text-slate-200 hover:border-sky-500"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <span className="relative block h-10 w-10 shrink-0">
        <img
          src={racePortraitUrl}
          alt={`${member?.race || "Race"} portrait`}
          className="h-10 w-10 rounded border border-slate-600 bg-slate-950 object-cover"
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
          }}
        />
        <img
          src={classIconUrl}
          alt={charClass}
          className="absolute -bottom-1 -right-1 h-5 w-5 rounded border border-slate-900 bg-slate-950 object-cover shadow"
          onError={(event) => {
            event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
          }}
        />
      </span>
      <span className="min-w-0">
        <span
          className="block truncate text-sm font-bold"
          style={classInfo.color ? { color: classInfo.color } : undefined}
        >
          {member.name}
        </span>
        <span className="block truncate text-xs text-slate-400">
          Lv {member.level} - {member.role || "DPS"} - {charClass || "Adventurer"}
        </span>
      </span>
    </button>
  );
};

const ProfileStat = ({ label, value }) => (
  <div className="rounded border border-slate-700 bg-slate-950/70 p-2">
    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    <div className="text-sm font-bold text-slate-100">{value}</div>
  </div>
);

export default function BattlefieldsPage({
  roster = [],
  activeMissions = [],
  battlefieldState,
  worldPvpState,
  guildLog = [],
  guildSetup = {},
  currentDayIndex = 0,
  gameTimeMs = 0,
  onQueueWarsongGulch,
  onPvpActivityFocusChange,
}) {
  const state = useMemo(
    () => ensureBattlefieldState(battlefieldState),
    [battlefieldState],
  );
  const safeWorldPvpState = useMemo(
    () => ensureWorldPvpState(worldPvpState),
    [worldPvpState],
  );
  const eligibleCharacters = useMemo(
    () =>
      getEligibleBattlegroundCharacters({
        roster,
        activeMissions,
        battlefieldState: state,
      }),
    [activeMissions, roster, state],
  );
  const eligibleByBracket = useMemo(
    () => groupCharactersByBattlegroundBracket(eligibleCharacters),
    [eligibleCharacters],
  );
  const firstAvailableBracket =
    BATTLEGROUND_BRACKETS.find(
      (bracket) => (eligibleByBracket[bracket.id] || []).length > 0,
    )?.id || BATTLEGROUND_BRACKETS[0].id;
  const [selectedBracketId, setSelectedBracketId] = useState(firstAvailableBracket);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    setSelectedBracketId((current) =>
      BATTLEGROUND_BRACKETS.some((bracket) => bracket.id === current)
        ? current
        : firstAvailableBracket,
    );
  }, [firstAvailableBracket]);

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) =>
        (eligibleByBracket[selectedBracketId] || []).some((member) => member.id === id),
      ),
    );
  }, [eligibleByBracket, selectedBracketId]);

  const selectedMembers = useMemo(() => {
    const bracketMembers = eligibleByBracket[selectedBracketId] || [];
    const selectedSet = new Set(selectedIds);
    return bracketMembers.filter((member) => selectedSet.has(member.id));
  }, [eligibleByBracket, selectedBracketId, selectedIds]);

  const teamProfile = useMemo(
    () => calculateBattlefieldTeamProfile(selectedMembers, WARSONG_GULCH.teamSize),
    [selectedMembers],
  );
  const selectedBracket = BATTLEGROUND_BRACKETS.find(
    (bracket) => bracket.id === selectedBracketId,
  );
  const previewEnemyTeam = useMemo(
    () =>
      generateAggregateEnemyTeam({
        playerTeamProfile: teamProfile,
        playerFaction: guildSetup.faction || GUILD_FACTION.ALLIANCE,
        bracket: selectedBracket,
        rng: () => 0.5,
      }),
    [guildSetup.faction, selectedBracket, teamProfile],
  );
  const estimatedWinChance = estimateBattlefieldWinChance(
    teamProfile,
    previewEnemyTeam,
  );
  const pvpConfig = getPvpActivityConfig(guildSetup.pvpActivityFocus);
  const zonePvpRows = useMemo(() => {
    const zoneStats = safeWorldPvpState.zoneStats || {};
    const currentMembersByZone = new Map();
    roster.forEach((member) => {
      const zoneId = String(member?.currentZoneId || "").trim();
      if (!zoneId) return;
      if (!currentMembersByZone.has(zoneId)) currentMembersByZone.set(zoneId, []);
      currentMembersByZone.get(zoneId).push(member);
    });

    const activeZoneIds = new Set([
      ...Object.keys(zoneStats),
      ...currentMembersByZone.keys(),
    ]);

    return [...activeZoneIds]
      .map((zoneId) => {
        const zone = getZoneById(zoneId);
        if (!zone) return null;
        const members = currentMembersByZone.get(zoneId) || [];
        const profile = getWorldPvpProfile({
          zone,
          characterFaction: guildSetup.faction,
          realmType: guildSetup.serverStyle,
        });
        const stats = zoneStats[zoneId] || {};
        return {
          zone,
          members,
          profile,
          riskChance: getWorldPvpRiskChance({ profile, characters: members }),
          eventsTriggered: Math.max(0, Number(stats.eventsTriggered) || 0),
          victories: Math.max(0, Number(stats.victories) || 0),
          defeats: Math.max(0, Number(stats.defeats) || 0),
          honorEarned: Math.max(0, Number(stats.honorEarned) || 0),
          lastEventDay: stats.lastEventDay,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftActivity = left.eventsTriggered + left.members.length;
        const rightActivity = right.eventsTriggered + right.members.length;
        if (rightActivity !== leftActivity) return rightActivity - leftActivity;
        return ZONE_DEFINITIONS.findIndex((zone) => zone.id === left.zone.id) -
          ZONE_DEFINITIONS.findIndex((zone) => zone.id === right.zone.id);
      });
  }, [
    guildSetup.faction,
    guildSetup.serverStyle,
    roster,
    safeWorldPvpState.zoneStats,
  ]);
  const recentWorldPvpLogs = useMemo(
    () =>
      (Array.isArray(guildLog) ? guildLog : [])
        .filter((log) => log?.type === "pvp" && log.zoneName)
        .slice(0, 5),
    [guildLog],
  );

  const toggleMember = (memberId) => {
    setSelectedIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }
      if (current.length >= WARSONG_GULCH.teamSize) return current;
      return [...current, memberId];
    });
  };

  const queueSelected = () => {
    const queued =
      typeof onQueueWarsongGulch === "function"
        ? onQueueWarsongGulch(selectedIds)
        : false;
    if (queued) setSelectedIds([]);
  };

  const activeBattleParticipants = (battle) => {
    const participantSet = new Set(
      (Array.isArray(battle?.participantIds) ? battle.participantIds : []).map(String),
    );
    return roster.filter((member) => participantSet.has(String(member.id)));
  };

  return (
    <section className="space-y-5 rounded-lg border border-red-900/60 bg-slate-950/80 p-4 shadow-xl">
      <div className="flex flex-col gap-3 border-b border-red-900/50 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="fantasy-font text-2xl text-red-100">Battlefields</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Warsong Gulch is open for bracketed capture-the-flag matches.
          </p>
        </div>
        <div className="rounded border border-red-900/70 bg-black/30 p-3 text-sm">
          <div className="text-[10px] uppercase tracking-wide text-red-300/80">
            PvP Activity Focus
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PVP_ACTIVITY_FOCUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPvpActivityFocusChange?.(option.value)}
                className={`rounded border px-3 py-1 text-xs font-bold ${
                  guildSetup.pvpActivityFocus === option.value
                    ? "border-red-300 bg-red-500/20 text-red-50"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-red-500"
                }`}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Auto queue: {pvpConfig.autoQueue ? `${pvpConfig.label}, cap ${pvpConfig.dailyCap}/day` : "Off"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded border border-slate-700 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="fantasy-font text-xl text-yellow-100">
                Queue Battlefield
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {WARSONG_GULCH.description}
              </p>
            </div>
            <div className="rounded border border-yellow-700/70 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
              {selectedMembers.length}/{WARSONG_GULCH.teamSize} Guild
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {BATTLEGROUND_BRACKETS.map((bracket) => {
              const count = (eligibleByBracket[bracket.id] || []).length;
              const wouldAutoQueue =
                pvpConfig.autoQueue &&
                count >= pvpConfig.minGuildMembers &&
                selectedBracketId === bracket.id;
              return (
                <button
                  key={bracket.id}
                  type="button"
                  onClick={() => {
                    setSelectedBracketId(bracket.id);
                    setSelectedIds([]);
                  }}
                  className={`rounded border px-3 py-2 text-xs font-bold ${
                    selectedBracketId === bracket.id
                      ? "border-sky-300 bg-sky-500/20 text-sky-50"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-600"
                  }`}
                >
                  {bracket.label} - {count}
                  {wouldAutoQueue ? " - Auto ready" : ""}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(eligibleByBracket[selectedBracketId] || []).map((member) => {
              const bracket = getBattlegroundBracketForLevel(member.level);
              return (
                <CharacterPick
                  key={member.id}
                  member={member}
                  selected={selectedIds.includes(member.id)}
                  disabled={bracket?.id !== selectedBracketId}
                  onToggle={toggleMember}
                />
              );
            })}
            {(eligibleByBracket[selectedBracketId] || []).length === 0 && (
              <div className="rounded border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400 sm:col-span-2">
                No available guild members in this bracket.
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <ProfileStat label="Queue" value={teamProfile.queueType} />
            <ProfileStat label="PUG Fill" value={teamProfile.pugCount} />
            <ProfileStat label="Win Chance" value={`${estimatedWinChance}%`} />
            <ProfileStat label="Power" value={teamProfile.teamPower} />
            <ProfileStat label="Healers" value={teamProfile.healerPower} />
            <ProfileStat label="Coord." value={teamProfile.coordination} />
          </div>

          <button
            type="button"
            onClick={queueSelected}
            disabled={selectedMembers.length === 0}
            className="mt-4 rounded border border-red-500 bg-red-900/70 px-5 py-2 text-sm font-bold text-red-50 shadow hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Queue Warsong Gulch
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-slate-700 bg-slate-900/70 p-4">
            <h3 className="fantasy-font text-xl text-sky-100">Active Battles</h3>
            <div className="mt-3 space-y-3">
              {state.activeBattles.length === 0 && (
                <div className="rounded border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">
                  No active battleground matches.
                </div>
              )}
              {state.activeBattles.map((battle) => {
                const participants = activeBattleParticipants(battle);
                return (
                  <div
                    key={battle.id}
                    className="rounded border border-sky-900/70 bg-slate-950/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-sky-100">{battle.name}</div>
                        <div className="text-xs text-slate-400">
                          {battle.bracketLabel} - {battle.teamProfile?.queueType}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-yellow-100">
                          {battle.playerScore}-{battle.enemyScore}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatTimeRemaining(battle, gameTimeMs)} remaining
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      vs {battle.enemyTeam?.name || "Enemy Team"} -{" "}
                      {participants.map((member) => member.name).join(", ")}
                    </div>
                    <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
                      {[...(battle.events || [])].slice(-6).reverse().map((event) => (
                        <div
                          key={event.id}
                          className="rounded border border-slate-800 bg-black/30 p-2 text-xs text-slate-300"
                        >
                          <span className="text-sky-300">{event.atMinute}m</span>{" "}
                          {event.summary}
                        </div>
                      ))}
                      {(battle.events || []).length === 0 && (
                        <div className="text-xs text-slate-500">
                          The gates are open. First clash incoming.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded border border-slate-700 bg-slate-900/70 p-4">
            <h3 className="fantasy-font text-xl text-amber-100">Battle History</h3>
            <div className="mt-3 space-y-2">
              {state.history.length === 0 && (
                <div className="rounded border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">
                  No completed battlegrounds yet.
                </div>
              )}
              {state.history.slice(0, 8).map((battle) => (
                <div
                  key={battle.id}
                  className="rounded border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={`font-bold ${getBattleResultClass(battle.result)}`}>
                        {getBattleResultLabel(battle.result)} {battle.playerScore}-
                        {battle.enemyScore}
                      </div>
                      <div className="text-xs text-slate-400">
                        Day {Number(battle.startDay ?? currentDayIndex) + 1} -{" "}
                        {battle.bracketLabel}
                      </div>
                    </div>
                    <div className="text-right text-xs text-yellow-200">
                      +{battle.reward?.honorPerParticipant || 0} Honor
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border border-slate-700 bg-slate-900/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="fantasy-font text-xl text-red-100">Zone PvP</h3>
            <p className="mt-1 text-sm text-slate-400">
              World PvP happens during zone progression on PvP realms and awards
              personal honor through the same PvP rank system.
            </p>
          </div>
          <div className="rounded border border-red-900/70 bg-black/30 px-3 py-2 text-xs text-red-100">
            Total Honor {safeWorldPvpState.totalHonor} - Weekly{" "}
            {safeWorldPvpState.weeklyHonor}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-2">
            {zonePvpRows.length === 0 && (
              <div className="rounded border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">
                No zone PvP activity yet. Send heroes into contested zones on a PvP
                realm to stir things up.
              </div>
            )}
            {zonePvpRows.slice(0, 8).map((row) => (
              <div
                key={row.zone.id}
                className="rounded border border-slate-800 bg-slate-950/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-100">{row.zone.name}</div>
                    <div className="text-xs text-slate-400">
                      {row.profile.label} - Risk {Math.round(row.riskChance * 100)}%
                      {row.members.length > 0
                        ? ` - ${row.members.length} hero${row.members.length === 1 ? "" : "es"} currently there`
                        : ""}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-300">
                    <div>{row.eventsTriggered} fights</div>
                    <div className="text-yellow-200">+{row.honorEarned} honor</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span className="rounded border border-emerald-900/70 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                    {row.victories} wins
                  </span>
                  <span className="rounded border border-red-900/70 bg-red-500/10 px-2 py-1 text-red-200">
                    {row.defeats} losses
                  </span>
                  {Number.isFinite(Number(row.lastEventDay)) && (
                    <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
                      Last fight Day {Number(row.lastEventDay) + 1}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/70 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Recent World PvP
            </div>
            <div className="mt-3 space-y-2">
              {recentWorldPvpLogs.length === 0 && (
                <div className="text-sm text-slate-500">No world PvP logs yet.</div>
              )}
              {recentWorldPvpLogs.map((log, index) => (
                <div
                  key={`${log.time || "pvp"}-${log.zoneName}-${index}`}
                  className="rounded border border-slate-800 bg-black/30 p-2 text-xs text-slate-300"
                >
                  <div className="font-bold text-red-100">{log.zoneName}</div>
                  <div>{log.summary || log.message}</div>
                  {Number(log.honor) > 0 && (
                    <div className="mt-1 text-yellow-200">+{log.honor} honor</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
