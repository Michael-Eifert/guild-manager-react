import type { ComponentType } from "react";

import RealmOverviewModal from "../../components/modals/RealmOverviewModal";
import type { Character } from "../../types/characterTypes";
import type { Mission } from "../../types/missionTypes";

type RealmPageProps = {
  realmState: Record<string, unknown>;
  guildSetup: Record<string, unknown>;
  roster: Character[];
  missionList: Mission[];
  guildProgress: Record<string, unknown>;
  raidLockouts: Record<string, unknown>;
  currentDayIndex: number;
};

// Temporary adapter until RealmOverviewModal itself is migrated from JSX.
const PageRealmOverviewModal = RealmOverviewModal as ComponentType<
  RealmPageProps & { isOpen: true; variant: "page" }
>;

export default function RealmPage({
  realmState,
  guildSetup,
  roster,
  missionList,
  guildProgress,
  raidLockouts,
  currentDayIndex,
}: RealmPageProps) {
  return (
    <PageRealmOverviewModal
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
