import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import ToastNotifications from "../../components/ToastNotifications";
import AppErrorBoundary from "../../components/AppErrorBoundary";
import LoadingFallback from "../../components/LoadingFallback";
import AppShell from "../../components/shell/AppShell";
import GameHeader from "../../components/shell/GameHeader";
import ChatPanel from "../../components/chat/ChatPanel";
import ChatPreview from "../../components/chat/ChatPreview";
import { buildHomeNavigation } from "../../components/shell/homeNavigation";
import { useGame } from "../../app/useGame";
import { GUILD_POINT_LABEL } from "../../guildProgression";
import {
  getFactionFallbackManagerName,
  getGuildServerLabel,
} from "../../guild/guildSetup";
import { getActiveDungeonRunCount } from "../../dungeons/dungeonBoardUtils";
import { ROUTES } from "../../routes";

const AdventureBoardPage = lazy(() => import("../adventure-board/AdventureBoardPage"));
const BattlefieldsPage = lazy(() => import("../battlefields/BattlefieldsPage"));
const CalendarPage = lazy(() => import("../calendar/CalendarPage"));
const ChatPage = lazy(() => import("../chat/ChatPage"));
const DatabasePage = lazy(() => import("../database/DatabasePage"));
const DashboardPage = lazy(() => import("../dashboard/DashboardPage"));
const DungeonBoardPage = lazy(() => import("../dungeon-board/DungeonBoardPage"));
const GuildLogPage = lazy(() => import("../guild-log/GuildLogPage"));
const GuildPage = lazy(() => import("../guild/GuildPage"));
const MissionBoardPage = lazy(() => import("../mission-board/MissionBoardPage"));
const ProfessionsPage = lazy(() => import("../professions/ProfessionsPage"));
const RealmPage = lazy(() => import("../realm/RealmPage"));
const RecruitPage = lazy(() => import("../recruit/RecruitPage"));

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
  RECRUIT: "recruit",
  CALENDAR: "calendar",
  REALM: "realm",
  MISSION_BOARD: "mission-board",
  ADVENTURE_BOARD: "adventure-board",
  DUNGEON_BOARD: "dungeon-board",
  BATTLEFIELDS: "battlefields",
  PROFESSIONS: "professions",
  DATABASE: "database",
  GUILD_LOG: "guild-log",
  CHAT: "chat",
});

export default function HomeRoot() {
  const game = useGame();
  const {
    actions,
    activeMissions,
    battlefieldState,
    bestGuildMemberSearchMatchId,
    calendarState,
    chatAiSettings,
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
    handleChatAiSettingsChange,
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
    handleMarkChatRead,
    handleManualFinish,
    handleModeChange,
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
    handleTestChatProvider,
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
    socialState,
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
    setAllDashboardSectionsOpen,
    toggleDashboardSection,
    worldPvpState,
    unreadChatCount,
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
    openOptions,
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
  const navigationItems = buildHomeNavigation({
    applicationCount: openRealmApplicationCount,
    activeDungeonCount: activeDungeonRunCount,
    activeBattlefieldCount,
    unreadChatCount,
  });
  const guildName =
    guildSetup.name || getFactionFallbackManagerName(guildSetup.faction);
  const calendarLabel = `${currentCalendarDate.weekdayName}, ${currentCalendarDate.monthName} ${currentCalendarDate.dayOfMonth}, Year ${currentCalendarDate.year}`;

  return (
    <AppShell
      navigationItems={navigationItems}
      chatUnreadCount={unreadChatCount}
      chatPanel={
        <ChatPanel
          socialState={socialState}
          guildName={guildName}
          onMarkRead={handleMarkChatRead}
          compact
        />
      }
      header={
        <GameHeader
          guildName={guildName}
          faction={guildSetup.faction}
          factionIconUrl={factionMissionIconUrl}
          realmLabel={getGuildServerLabel(
            guildSetup.server,
            guildSetup.serverStyle,
          )}
          focus={guildSetup.focus}
          calendarLabel={calendarLabel}
          dayProgressPercent={currentCalendarDayProgressPercent}
          memberCount={roster.length}
          maxRoster={guildDerivedStats.maxRoster}
          guildGold={guildGold}
          goldCap={guildDerivedStats.goldCap}
          renownLabel={GUILD_POINT_LABEL}
          renownPoints={guildProgress.renownPoints}
          isPaused={isPaused}
          gameSpeed={gameSpeed}
          onOpenSettings={openOptions}
          onTogglePause={togglePause}
          onCycleSpeed={cycleGameSpeed}
        />
      }
    >
      <ToastNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <AppErrorBoundary>
        <Suspense fallback={<LoadingFallback label="Loading guild page…" />}>
          <Routes>
          <Route
            index
            element={
              <DashboardPage
                chatPreview={
                  <ChatPreview
                    socialState={socialState}
                    unreadCount={unreadChatCount}
                  />
                }
                guildActivityModeSummary={guildActivityModeSummary}
                dashboardSectionsOpen={dashboardSectionsOpen}
                onToggleDashboardSection={toggleDashboardSection}
                onSetAllDashboardSectionsOpen={setAllDashboardSectionsOpen}
                onGuildModeChange={handleGuildModeChange}
                guildSetup={guildSetup}
                guildRelationships={guildRelationships}
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
            path={HOME_ROUTE_PATHS.CHAT}
            element={
              <ChatPage
                socialState={socialState}
                guildName={guildName}
                onMarkRead={handleMarkChatRead}
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
            path={HOME_ROUTE_PATHS.RECRUIT}
            element={
              <RecruitPage
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
                socialState={socialState}
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
          <Route
            path={HOME_ROUTE_PATHS.PROFESSIONS}
            element={
              <ProfessionsPage
                roster={roster}
                guildInventory={guildInventory}
                stashPolicy={stashPolicy}
                guildGold={guildGold}
                onCraftRecipe={handleCraftRecipe}
                onSellStashItem={handleSellStashItem}
                onCleanupGuildStash={handleCleanupGuildStash}
                onTryAutoEquipFromGuildStash={handleTryAutoEquipFromGuildStash}
              />
            }
          />
          <Route
            path={HOME_ROUTE_PATHS.DATABASE}
            element={<DatabasePage itemDatabase={itemDatabase} />}
          />
          <Route
            path={HOME_ROUTE_PATHS.GUILD_LOG}
            element={<GuildLogPage logs={guildLog} missionList={missionList} />}
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
            chatAiSettings={chatAiSettings}
            onChatAiSettingsChange={handleChatAiSettingsChange}
            onTestChatProvider={handleTestChatProvider}
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
    </AppShell>
  );
}
