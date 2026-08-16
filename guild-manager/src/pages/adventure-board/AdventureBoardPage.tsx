import type { ComponentType } from "react";

import WorldMapModal from "../../components/modals/WorldMapModal";
import type { Character } from "../../types/characterTypes";
import type { Mission } from "../../types/missionTypes";

type ForwardedCallback = (...args: never[]) => unknown;

type AdventureBoardPageProps = {
  roster: Character[];
  missionList: Mission[];
  activeMissions: Mission[];
  realmState: Record<string, unknown> | null;
  worldPvpState: Record<string, unknown> | null;
  guildLog: Array<Record<string, unknown>>;
  guildName: string;
  gameTimeMs: number;
  guildFaction: string;
  realmType: string;
  contentPhase?: "classic" | "tbc_prepatch";
  onDeploy: ForwardedCallback;
  getMissionPreview: ForwardedCallback;
};

// Temporary adapter until WorldMapModal itself is migrated from JSX.
const PageWorldMapModal = WorldMapModal as unknown as ComponentType<
  AdventureBoardPageProps & { isOpen: true; variant: "page" }
>;

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
  contentPhase,
  onDeploy,
  getMissionPreview,
}: AdventureBoardPageProps) {
  return (
    <PageWorldMapModal
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
      contentPhase={contentPhase}
      onDeploy={onDeploy}
      getMissionPreview={getMissionPreview}
    />
  );
}
