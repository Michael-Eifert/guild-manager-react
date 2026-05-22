import WorldMapModal from "../../components/modals/WorldMapModal";

export default function AdventureBoardPage({
  roster,
  missionList,
  activeMissions,
  realmState,
  worldPvpState,
  guildLog,
  guildName,
  gameTimeMs,
  guildFaction,
  realmType,
  onDeploy,
  getMissionPreview,
}) {
  return (
    <WorldMapModal
      variant="page"
      isOpen
      roster={roster}
      missionList={missionList}
      activeMissions={activeMissions}
      realmState={realmState}
      worldPvpState={worldPvpState}
      guildLog={guildLog}
      guildName={guildName}
      gameTimeMs={gameTimeMs}
      guildFaction={guildFaction}
      realmType={realmType}
      onDeploy={onDeploy}
      getMissionPreview={getMissionPreview}
    />
  );
}
