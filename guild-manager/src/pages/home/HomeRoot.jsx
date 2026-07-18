import React, { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import ToastNotifications from "../../components/ToastNotifications";
import AppErrorBoundary from "../../components/AppErrorBoundary";
import LoadingFallback from "../../components/LoadingFallback";
import { useGame } from "../../app/useGame";
import { GUILD_POINT_LABEL } from "../../guildProgression";
import {
  getFactionFallbackManagerName,
  getGuildServerLabel,
} from "../../guild/guildSetup";
import { formatGameSpeedLabel } from "../../progression";
import { getActiveDungeonRunCount } from "../../dungeons/dungeonBoardUtils";
import { getWowIconUrl } from "../../utils";
import { ROUTES } from "../../routes";

const AdventureBoardPage = lazy(() => import("../adventure-board/AdventureBoardPage"));
const BattlefieldsPage = lazy(() => import("../battlefields/BattlefieldsPage"));
const CalendarPage = lazy(() => import("../calendar/CalendarPage"));
const DashboardPage = lazy(() => import("../dashboard/DashboardPage"));
const DungeonBoardPage = lazy(() => import("../dungeon-board/DungeonBoardPage"));
const GuildPage = lazy(() => import("../guild/GuildPage"));
const MissionBoardPage = lazy(() => import("../mission-board/MissionBoardPage"));
const RealmPage = lazy(() => import("../realm/RealmPage"));

const RecruitModal = lazy(() => import("../../components/modals/RecruitModal"));
const DetailModal = lazy(() => import("../../components/modals/DetailModal"));
const LootTableModal = lazy(() => import("../../components/modals/LootTableModal"));
const GuildLogModal = lazy(() => import("../../components/modals/GuildLogModal"));
const DebugModal = lazy(() => import("../../components/modals/DebugModal"));
const OptionsModal = lazy(() => import("../../components/modals/OptionsModal"));
const ProfessionsModal = lazy(() => import("../../components/modals/ProfessionsModal"));

const GUILD_FOCUS_CHANGE_COST_GOLD = 10;

const HOME_ROUTE_PATHS = Object.freeze({
  DASHBOARD: "",
  GUILD: "guild",
  CALENDAR: "calendar",
  REALM: "realm",
  MISSION_BOARD: "mission-board",
  ADVENTURE_BOARD: "adventure-board",
  DUNGEON_BOARD: "dungeon-board",
  BATTLEFIELDS: "battlefields",
});

export default function HomeRoot() {
  const game = useGame();
  const {
    actions,
    activeMissions,
    battlefieldState,
    bestGuildMemberSearchMatchId,
    calendarState,
    currentCalendarDate,
    currentCalendarDayIndex,
    currentCalendarDayProgressPercent,
    dashboardSectionsOpen,
    debugActions,
    detailCharId,
    dismissNotification,
    dungeonActivityInfoText,
    factionMissionIconUrl,
    gameSpeed,
    gameTimeMs,
    getAdjustedMissionSuccessPreview,
    guildInventory,
    guildActivityModeSummary,
    guildClassSummary,
    guildDerivedStats,
    guildFocusBonuses,
    guildGold,
    guildLog,
    guildMemberMaxLevelFilter,
    guildMemberMinLevelFilter,
    guildMemberSearch,
    guildMemberSortMode,
    guildProgress,
    guildRelationships,
    guildRoleSummary,
    guildSetup,
    handleCleanupGuildStash,
    handleCancelCalendarEvent,
    handleCancelCalendarSeries,
    handleChangeGuildFocus,
    handleClearAdventureGoal,
    handleCreateCalendarEvent,
    handleCreateCalendarSeries,
    handleCraftRecipe,
    handleDeclineApplications,
    handleDeploy,
    handleDismiss,
    handleGenerateBackstory,
    handleGuildDungeonActivityChange,
    handleGuildModeChange,
    handleGuildSuccessRateChange,
    handleLoadButtonClick,
    handleLoadSessionFile,
    handleLockCalendarEventRoster,
    handleManualFinish,
    handleModeChange,
    handleOpenRecruit,
    handleProfChange,
    handlePvpActivityFocusChange,
    handleQueueWarsongGulch,
    handleQueueAdventureGoal,
    handleRecruit,
    handleRecruitApplications,
    handleSaveSession,
    handleScoutRecruitmentTier,
    handleSellStashItem,
    handleStartCalendarEvent,
    handleTryAutoEquipFromGuildStash,
    handleUpdateBackstory,
    handleUpdateCalendarEventRoster,
    handleUpgradeGuildTalent,
    hasAnyGuildMemberLevelFilter,
    hasGuildMemberSearch,
    hasGuildMemberSearchMatch,
    isPaused,
    itemDatabase,
    memberRankingMode,
    missionAchievementCatalog,
    missionBoardState,
    missionList,
    notifications,
    openRealmApplicationCount,
    openRecruitSlots,
    pushNotification,
    raidLockouts,
    rankedRoster,
    realmApplicationCandidates,
    realmRecruitmentMarketStats,
    realmState,
    roster,
    sessionFileInputRef,
    showDebug,
    showGuildLog,
    showLootTable,
    showOptions,
    showProfessions,
    showRecruit,
    SHOW_LEGACY_QUESTS,
    stashPolicy,
    toggleDashboardSection,
    worldPvpState,
  } = game;
  const {
    closeCharacterDetail,
    closeDebug,
    closeGuildLog,
    closeLootTable,
    closeOptions,
    closeProfessions,
    closeRecruit,
    cycleGameSpeed,
    openDebug,
    openGuildLog,
    openLootTable,
    openOptions,
    openProfessions,
    selectCharacter,
    togglePause,
    updateMemberMaxLevel,
    updateMemberMinLevel,
    updateMemberRankingMode,
    updateMemberRole,
    updateMemberSearch,
    updateMemberSortMode,
    updateMissionBoardState,
  } = actions || {};

  if (!guildSetup.hasStarted) {
    return <Navigate to={ROUTES.START} replace />;
  }

  const activeDungeonRunCount = getActiveDungeonRunCount(activeMissions);
  const activeBattlefieldCount = Array.isArray(battlefieldState?.activeBattles)
    ? battlefieldState.activeBattles.length
    : 0;

  return (
    <div className="wow-shell w-full max-w-5xl mx-auto p-4 pb-20">
      <ToastNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <header className="wow-header flex justify-between items-center mb-6 border-b border-gray-700 pb-4 px-2 rounded-md">
        <div className="min-w-0 flex flex-1 items-start gap-3">
          <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded border border-amber-700/70 bg-gray-950/60 shadow-inner md:h-16 md:w-12">
            <img
              src={factionMissionIconUrl}
              alt={`${guildSetup.faction} banner`}
              className="h-11 w-8 object-contain drop-shadow md:h-12 md:w-9"
              onError={(event) => {
                event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
              }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="wow-header-title fantasy-font text-xl md:text-3xl font-bold truncate">
              {guildSetup.name || getFactionFallbackManagerName(guildSetup.faction)}
            </h1>
            <p className="text-amber-100/70 text-xs md:text-sm tracking-wide">
              {guildSetup.faction} Command - Realm:{" "}
              {getGuildServerLabel(guildSetup.server, guildSetup.serverStyle)} -
              Focus: {guildSetup.focus}
            </p>
            <p className="text-cyan-100/70 text-[11px] md:text-xs tracking-wide mt-1">
              {currentCalendarDate.weekdayName}, {currentCalendarDate.monthName}{" "}
              {currentCalendarDate.dayOfMonth}, Year {currentCalendarDate.year}
            </p>
            <div className="mt-2 w-full max-w-xs">
              <div className="h-1.5 overflow-hidden rounded-full border border-cyan-900/70 bg-gray-950/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-amber-300 transition-[width] duration-300"
                  style={{ width: `${currentCalendarDayProgressPercent}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-cyan-100/50">
                <span>Day progress</span>
                <span>{currentCalendarDayProgressPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right flex-none ml-2">
          <div className="text-sm md:text-xl fantasy-font">
            Mem:{" "}
            <span
              className={
                roster.length >= guildDerivedStats.maxRoster ? "text-red-500" : ""
              }
            >
              {roster.length}
            </span>
            /{guildDerivedStats.maxRoster}
          </div>
          <div className="text-xs md:text-sm text-yellow-400 font-bold mt-1">
            Gold: {guildGold}/{guildDerivedStats.goldCap}
          </div>
          <div className="text-[11px] text-amber-200/80 mt-1">
            {GUILD_POINT_LABEL}: {guildProgress.renownPoints}
          </div>
          <button
            onClick={openOptions}
            aria-label="Settings"
            title="Settings"
            className="mt-2 inline-grid h-8 w-8 place-items-center rounded border border-gray-500 bg-gray-800 text-gray-200 shadow hover:bg-gray-700 align-top"
          >
            <span className="text-base" aria-hidden="true">
              &#9881;&#65039;
            </span>
          </button>
          <button
            onClick={togglePause}
            className={`mt-2 ml-2 px-3 py-1 rounded text-xs md:text-sm font-bold shadow border ${
              isPaused
                ? "bg-gray-800 border-yellow-600 text-yellow-500"
                : "bg-gray-800 border-gray-600 text-green-400"
            }`}
          >
            {isPaused ? (
              <span aria-hidden="true">&#9654;</span>
            ) : (
              <span aria-hidden="true">&#9208;</span>
            )}
          </button>
          <button
            onClick={cycleGameSpeed}
            className={`mt-2 ml-2 px-3 py-1 rounded text-xs md:text-sm font-bold shadow border ${
              gameSpeed > 1
                ? "bg-blue-900 border-blue-500 text-blue-100"
                : "bg-gray-800 border-gray-600 text-gray-200"
            }`}
          >
            {formatGameSpeedLabel(gameSpeed)}
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 md:gap-3 mb-6 pb-2">
        <NavLink
          to={ROUTES.DASHBOARD}
          end
          className={({ isActive }) =>
            `home-nav-item wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border text-yellow-100 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
              isActive ? "home-nav-active" : "border-yellow-800"
            }`
          }
        >
          <span className="text-xl" aria-hidden="true">
            &#127968;
          </span>
          Home
        </NavLink>

        <button
          onClick={handleOpenRecruit}
          disabled={openRecruitSlots <= 0 && openRealmApplicationCount <= 0}
          aria-pressed={showRecruit}
          className={`home-nav-item flex-none snap-start btn-recruit text-yellow-100 font-bold py-3 px-6 rounded border border-yellow-900 shadow-lg flex items-center gap-2 select-none disabled:opacity-50 whitespace-nowrap ${
            openRealmApplicationCount > 0 ? "btn-recruit-applications" : ""
          } ${showRecruit ? "home-nav-active" : ""}`}
        >
          <span className="text-xl">&#128220;</span> Recruit
          {openRealmApplicationCount > 0 && (
            <span className="rounded-full border border-yellow-200/70 bg-yellow-300/20 px-2 py-0.5 text-xs text-yellow-50">
              {openRealmApplicationCount}
            </span>
          )}
        </button>

        <NavLink
          to={ROUTES.GUILD}
          className={({ isActive }) =>
            `home-nav-item wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border text-amber-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
              isActive ? "home-nav-active" : "border-amber-700"
            }`
          }
        >
          <span className="text-xl" aria-hidden="true">
            &#127775;
          </span>
          Guild
        </NavLink>
        <NavLink
          to={ROUTES.MISSION_BOARD}
          className={({ isActive }) =>
            `home-nav-item flex-none snap-start btn-quest text-blue-100 font-bold py-3 px-6 rounded border shadow-lg flex items-center gap-2 select-none whitespace-nowrap ${
              isActive ? "home-nav-active" : "border-blue-800"
            }`
          }
        >
          <img
            src={factionMissionIconUrl}
            alt={guildSetup.faction}
            className="w-5 h-5 rounded-sm border border-blue-900/60 object-cover"
            onError={(event) => {
              event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
            }}
          />
          Missions
        </NavLink>
        <NavLink
          to={ROUTES.CALENDAR}
          className={({ isActive }) =>
            `home-nav-item wow-command flex-none px-4 py-3 rounded bg-gray-800 border text-indigo-200 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
              isActive ? "home-nav-active" : "border-indigo-700"
            }`
          }
        >
          <img
            src={getWowIconUrl("inv_misc_note_05")}
            alt=""
            className="w-5 h-5 rounded-sm border border-indigo-900/60 object-cover"
            onError={(event) => {
              event.currentTarget.src = getWowIconUrl("inv_misc_questionmark");
            }}
          />
          Calendar
        </NavLink>
        <NavLink
          to={ROUTES.REALM}
          className={({ isActive }) =>
            `home-nav-item wow-command flex-none px-4 py-3 rounded bg-gradient-to-b from-amber-950/80 to-gray-900 border text-amber-100 hover:from-amber-900/80 hover:to-gray-800 shadow flex items-center gap-2 whitespace-nowrap ${
              isActive ? "home-nav-active" : "border-amber-600"
            }`
          }
        >
          <span
            aria-hidden="true"
            className="grid h-5 w-5 grid-cols-3 items-end gap-0.5 rounded-sm border border-amber-500/70 bg-slate-950/80 px-1 py-0.5 shadow"
          >
            <span className="h-2 rounded-sm bg-amber-700" />
            <span className="h-4 rounded-sm bg-amber-300" />
            <span className="h-3 rounded-sm bg-amber-500" />
          </span>
          Realm
        </NavLink>
        <NavLink
          to={ROUTES.ADVENTURE_BOARD}
          className={({ isActive }) =>
            `home-nav-item btn-adventure-board flex-none snap-start px-5 py-3 rounded border shadow flex items-center gap-2 whitespace-nowrap ${
              isActive ? "home-nav-active" : ""
            }`
          }
        >
          <span className="text-xl" aria-hidden="true">
            &#128506;&#65039;
          </span>
          Adventure Board
        </NavLink>
        <NavLink
          to={ROUTES.DUNGEON_BOARD}
          className={({ isActive }) =>
            `home-nav-item wow-command flex-none px-4 py-3 rounded border text-cyan-100 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
              activeDungeonRunCount > 0
                ? "border-cyan-400 bg-cyan-950/45 shadow-cyan-900/40"
                : "border-cyan-800 bg-gray-800"
            } ${isActive ? "home-nav-active" : ""}`
          }
        >
          <span className="text-xl" aria-hidden="true">
            &#9878;
          </span>
          Dungeon Board
          {activeDungeonRunCount > 0 && (
            <span className="rounded-full border border-cyan-200/70 bg-cyan-300/20 px-2 py-0.5 text-xs text-cyan-50">
              {activeDungeonRunCount}
            </span>
          )}
        </NavLink>
        <NavLink
          to={ROUTES.BATTLEFIELDS}
          className={({ isActive }) =>
            `home-nav-item wow-command flex-none px-4 py-3 rounded border text-red-100 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
              activeBattlefieldCount > 0
                ? "border-red-400 bg-red-950/45 shadow-red-900/40"
                : "border-red-800 bg-gray-800"
            } ${isActive ? "home-nav-active" : ""}`
          }
        >
          <span className="text-xl" aria-hidden="true">
            &#9876;&#65039;
          </span>
          Battlefields
          {activeBattlefieldCount > 0 && (
            <span className="rounded-full border border-red-200/70 bg-red-300/20 px-2 py-0.5 text-xs text-red-50">
              {activeBattlefieldCount}
            </span>
          )}
        </NavLink>
        <button
          onClick={openProfessions}
          aria-pressed={showProfessions}
          className={`home-nav-item wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-emerald-700 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
            showProfessions ? "home-nav-active" : ""
          }`}
        >
          <span className="text-xl" aria-hidden="true">
            &#9874;
          </span>
          Professions
        </button>
        <button
          onClick={openLootTable}
          aria-pressed={showLootTable}
          className={`home-nav-item wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
            showLootTable ? "home-nav-active" : ""
          }`}
        >
          <span className="text-xl" aria-hidden="true">
            &#128218;
          </span>
          DB
        </button>
        <button
          onClick={openGuildLog}
          aria-pressed={showGuildLog}
          className={`home-nav-item wow-command flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap ${
            showGuildLog ? "home-nav-active" : ""
          }`}
        >
          <span className="text-xl" aria-hidden="true">
            &#128220;
          </span>
          Log
        </button>
      </nav>

      <AppErrorBoundary>
        <Suspense fallback={<LoadingFallback label="Loading guild page…" />}>
          <Routes>
          <Route
            index
            element={
              <DashboardPage
                guildActivityModeSummary={guildActivityModeSummary}
                dashboardSectionsOpen={dashboardSectionsOpen}
                onToggleDashboardSection={toggleDashboardSection}
                onGuildModeChange={handleGuildModeChange}
                guildSetup={guildSetup}
                roster={roster}
                onGuildSuccessRateChange={handleGuildSuccessRateChange}
                dungeonActivityInfoText={dungeonActivityInfoText}
                onGuildDungeonActivityChange={handleGuildDungeonActivityChange}
                onPvpActivityFocusChange={handlePvpActivityFocusChange}
                guildRoleSummary={guildRoleSummary}
                guildClassSummary={guildClassSummary}
                guildMemberSearch={guildMemberSearch}
                onGuildMemberSearchChange={updateMemberSearch}
                memberRankingMode={memberRankingMode}
                onMemberRankingModeChange={updateMemberRankingMode}
                guildMemberSortMode={guildMemberSortMode}
                onGuildMemberSortModeChange={updateMemberSortMode}
                guildMemberMinLevelFilter={guildMemberMinLevelFilter}
                onGuildMemberMinLevelFilterChange={updateMemberMinLevel}
                guildMemberMaxLevelFilter={guildMemberMaxLevelFilter}
                onGuildMemberMaxLevelFilterChange={updateMemberMaxLevel}
                onClearGuildMemberFilters={() => {
                  updateMemberSearch("");
                  updateMemberMinLevel("");
                  updateMemberMaxLevel("");
                }}
                hasAnyGuildMemberLevelFilter={hasAnyGuildMemberLevelFilter}
                hasGuildMemberSearch={hasGuildMemberSearch}
                rankedRoster={rankedRoster}
                hasGuildMemberSearchMatch={hasGuildMemberSearchMatch}
                bestGuildMemberSearchMatchId={bestGuildMemberSearchMatchId}
                onSelectCharacter={selectCharacter}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.GUILD}
            element={
              <GuildPage
                guildProgress={guildProgress}
                guildGold={guildGold}
                guildDerivedStats={guildDerivedStats}
                guildSetup={guildSetup}
                currentDayIndex={currentCalendarDayIndex}
                focusChangeCostGold={GUILD_FOCUS_CHANGE_COST_GOLD}
                onChangeGuildFocus={handleChangeGuildFocus}
                onUpgradeTalent={handleUpgradeGuildTalent}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.CALENDAR}
            element={
              <CalendarPage
                calendarState={calendarState}
                currentDayIndex={currentCalendarDayIndex}
                missionList={missionList}
                roster={roster}
                activeMissions={activeMissions}
                raidLockouts={raidLockouts}
                dungeonSuccessBonus={guildFocusBonuses.dungeonSuccessBonus}
                onCreateEvent={handleCreateCalendarEvent}
                onCreateSeries={handleCreateCalendarSeries}
                onUpdateEventRoster={handleUpdateCalendarEventRoster}
                onLockEventRoster={handleLockCalendarEventRoster}
                onCancelEvent={handleCancelCalendarEvent}
                onCancelSeries={handleCancelCalendarSeries}
                onStartEvent={handleStartCalendarEvent}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.REALM}
            element={
              <RealmPage
                realmState={realmState}
                guildSetup={guildSetup}
                roster={roster}
                missionList={missionList}
                guildProgress={guildProgress}
                raidLockouts={raidLockouts}
                currentDayIndex={currentCalendarDayIndex}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.MISSION_BOARD}
            element={
              <MissionBoardPage
                roster={roster}
                onDeploy={handleDeploy}
                missionList={missionList}
                activeMissions={activeMissions}
                showLegacyQuests={SHOW_LEGACY_QUESTS}
                guildFaction={guildSetup.faction}
                dungeonSuccessBonus={guildFocusBonuses.dungeonSuccessBonus}
                guildExpMultiplier={
                  guildDerivedStats.expMultiplier * guildFocusBonuses.expMultiplier
                }
                isRaidUnlocked={guildDerivedStats.raidUnlocked}
                raidLockouts={raidLockouts}
                guildRelationships={guildRelationships}
                currentDayIndex={currentCalendarDayIndex}
                onNotify={pushNotification}
                itemDatabase={itemDatabase}
                missionBoardState={missionBoardState}
                onMissionBoardStateChange={updateMissionBoardState}
                guildInventory={guildInventory}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.ADVENTURE_BOARD}
            element={
              <AdventureBoardPage
                roster={roster}
                missionList={missionList}
                activeMissions={activeMissions}
                realmState={realmState}
                worldPvpState={worldPvpState}
                guildLog={guildLog}
                guildName={guildSetup.name}
                gameTimeMs={gameTimeMs}
                guildFaction={guildSetup.faction}
                realmType={guildSetup.serverStyle}
                onDeploy={handleDeploy}
                getMissionPreview={getAdjustedMissionSuccessPreview}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.DUNGEON_BOARD}
            element={
              <DungeonBoardPage
                roster={roster}
                missionList={missionList}
                activeMissions={activeMissions}
                gameTimeMs={gameTimeMs}
                onManualFinish={handleManualFinish}
                onQueueAdventureGoal={handleQueueAdventureGoal}
                onClearAdventureGoal={handleClearAdventureGoal}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.BATTLEFIELDS}
            element={
              <BattlefieldsPage
                roster={roster}
                activeMissions={activeMissions}
                battlefieldState={battlefieldState}
                worldPvpState={worldPvpState}
                guildLog={guildLog}
                guildSetup={guildSetup}
                currentDayIndex={currentCalendarDayIndex}
                gameTimeMs={gameTimeMs}
                onQueueWarsongGulch={handleQueueWarsongGulch}
                onPvpActivityFocusChange={handlePvpActivityFocusChange}
              />
            }
          />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>

      <input
        ref={sessionFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleLoadSessionFile}
      />

      <AppErrorBoundary>
        <Suspense fallback={<LoadingFallback label="Opening guild window…" />}>
        {showOptions && (
          <OptionsModal
            isOpen={showOptions}
            onClose={closeOptions}
            onSaveSession={handleSaveSession}
            onLoadSession={handleLoadButtonClick}
            onOpenDebug={openDebug}
          />
        )}

        {showRecruit && (
          <RecruitModal
            isOpen={showRecruit}
            onClose={closeRecruit}
            onRecruit={handleRecruit}
            onRecruitApplications={handleRecruitApplications}
            onDeclineApplications={handleDeclineApplications}
            applications={realmApplicationCandidates}
            marketStats={realmRecruitmentMarketStats}
            openSlots={openRecruitSlots}
            guildGold={guildGold}
            maxRoster={guildDerivedStats.maxRoster}
            rosterSize={roster.length}
            guildProgress={guildProgress}
            raidUnlocked={guildDerivedStats.raidUnlocked}
            onScoutTier={handleScoutRecruitmentTier}
          />
        )}
        {showLootTable && (
          <LootTableModal
            isOpen={showLootTable}
            onClose={closeLootTable}
            itemDatabase={itemDatabase}
          />
        )}
        {showProfessions && (
          <ProfessionsModal
            isOpen={showProfessions}
            onClose={closeProfessions}
            roster={roster}
            guildInventory={guildInventory}
            stashPolicy={stashPolicy}
            guildGold={guildGold}
            onCraftRecipe={handleCraftRecipe}
            onSellStashItem={handleSellStashItem}
            onCleanupGuildStash={handleCleanupGuildStash}
            onTryAutoEquipFromGuildStash={handleTryAutoEquipFromGuildStash}
          />
        )}
        {showGuildLog && (
          <GuildLogModal
            isOpen={showGuildLog}
            onClose={closeGuildLog}
            logs={guildLog}
            missionList={missionList}
          />
        )}
        {showDebug && (
          <DebugModal
            isOpen={showDebug}
            onClose={closeDebug}
            onBulkLevel={debugActions.bulkLevel}
            onAddGold={debugActions.addGold}
            onAddRenown={debugActions.addRenown}
            onAddPresetParty={debugActions.addPresetParty}
            onPrepareMoltenCoreTestGuild={debugActions.prepareMoltenCoreTestGuild}
            onPrepareBlackwingLairTestGuild={
              debugActions.prepareBlackwingLairTestGuild
            }
            onPrepareNaxxramasTestGuild={debugActions.prepareNaxxramasTestGuild}
            onReloadDatabase={debugActions.reloadDatabase}
          />
        )}
        {detailCharId && (
          <DetailModal
            char={roster.find((character) => character.id === detailCharId)}
            isOpen={!!detailCharId}
            missionAchievementCatalog={missionAchievementCatalog}
            missionList={missionList}
            itemDatabase={itemDatabase}
            roster={roster}
            guildFaction={guildSetup.faction}
            guildRelationships={guildRelationships}
            raidLockouts={raidLockouts}
            currentDayIndex={currentCalendarDayIndex}
            onClose={closeCharacterDetail}
            onDismiss={handleDismiss}
            onModeChange={handleModeChange}
            onProfChange={handleProfChange}
            onGenerateBackstory={handleGenerateBackstory}
            onUpdateBackstory={handleUpdateBackstory}
            onLevelChange={debugActions.changeLevel}
            onRoleChange={updateMemberRole}
          />
        )}
        </Suspense>
      </AppErrorBoundary>
    </div>
  );
}
