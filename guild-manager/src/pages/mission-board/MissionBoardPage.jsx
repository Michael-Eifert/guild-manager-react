import MissionModal from "../../components/modals/MissionModal";

export default function MissionBoardPage({
  roster,
  onDeploy,
  missionList,
  activeMissions,
  showLegacyQuests,
  guildFaction,
  dungeonSuccessBonus,
  guildExpMultiplier,
  isRaidUnlocked,
  raidLockouts,
  guildRelationships,
  currentDayIndex,
  onNotify,
  itemDatabase = [],
  missionBoardState,
  onMissionBoardStateChange,
}) {
  return (
    <MissionModal
      variant="page"
      isOpen
      roster={roster}
      onDeploy={onDeploy}
      missionList={missionList}
      activeMissions={activeMissions}
      showLegacyQuests={showLegacyQuests}
      guildFaction={guildFaction}
      dungeonSuccessBonus={dungeonSuccessBonus}
      guildExpMultiplier={guildExpMultiplier}
      isRaidUnlocked={isRaidUnlocked}
      raidLockouts={raidLockouts}
      guildRelationships={guildRelationships}
      currentDayIndex={currentDayIndex}
      onNotify={onNotify}
      itemDatabase={itemDatabase}
      missionBoardState={missionBoardState}
      onMissionBoardStateChange={onMissionBoardStateChange}
    />
  );
}
