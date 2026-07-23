import type { ComponentType } from "react";

import MissionModal from "../../components/modals/MissionModal";
import type { GuildInventory, ItemDefinition } from "../../types/itemTypes";
import type { Character } from "../../types/characterTypes";
import type { Mission } from "../../types/missionTypes";

type ForwardedCallback = (...args: never[]) => unknown;

type MissionBoardPageProps = {
  roster: Character[];
  onDeploy: ForwardedCallback;
  missionList: Mission[];
  activeMissions: Mission[];
  showLegacyQuests: boolean;
  guildFaction: string;
  dungeonSuccessBonus: number;
  guildExpMultiplier: number;
  isRaidUnlocked: boolean;
  raidLockouts: Record<string, unknown>;
  guildRelationships: Record<string, unknown>;
  currentDayIndex: number;
  onNotify: ForwardedCallback;
  itemDatabase?: ItemDefinition[];
  missionBoardState: Record<string, unknown> | null;
  onMissionBoardStateChange: ForwardedCallback;
  guildInventory?: GuildInventory | null;
};

// Temporary adapter until MissionModal itself is migrated from JSX.
const PageMissionModal = MissionModal as unknown as ComponentType<
  MissionBoardPageProps & { isOpen: true; variant: "page" }
>;

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
  guildInventory = null,
}: MissionBoardPageProps) {
  return (
    <PageMissionModal
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
      guildInventory={guildInventory}
    />
  );
}
