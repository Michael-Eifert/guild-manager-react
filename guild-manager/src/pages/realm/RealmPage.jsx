import RealmOverviewModal from "../../components/modals/RealmOverviewModal";

export default function RealmPage({
  realmState,
  guildSetup,
  roster,
  missionList,
  guildProgress,
  raidLockouts,
  currentDayIndex,
}) {
  return (
    <RealmOverviewModal
      variant="page"
      isOpen
      realmState={realmState}
      guildSetup={guildSetup}
      roster={roster}
      missionList={missionList}
      guildProgress={guildProgress}
      raidLockouts={raidLockouts}
      currentDayIndex={currentDayIndex}
    />
  );
}
