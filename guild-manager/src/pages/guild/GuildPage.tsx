import type { ComponentType } from "react";

import GuildTalentsModal from "../../components/modals/GuildTalentsModal";

type ForwardedCallback = (...args: never[]) => unknown;

type GuildPageProps = {
  guildProgress: Record<string, unknown>;
  guildGold: number;
  guildDerivedStats: Record<string, unknown>;
  guildSetup: Record<string, unknown>;
  currentDayIndex: number;
  focusChangeCostGold: number;
  onChangeGuildFocus: ForwardedCallback;
  onUpgradeTalent: ForwardedCallback;
  roster: unknown[];
  guildRelationships: Record<string, unknown>;
  guildActivityStats: Record<string, unknown>;
  guildOnlineSnapshot: Record<string, unknown>;
  missionList: unknown[];
  onSelectCharacter?: (characterId: string) => void;
};

// Temporary adapter until GuildTalentsModal itself is migrated from JSX.
const PageGuildTalentsModal = GuildTalentsModal as ComponentType<
  GuildPageProps & { isOpen: true; variant: "page" }
>;

export default function GuildPage({
  guildProgress,
  guildGold,
  guildDerivedStats,
  guildSetup,
  currentDayIndex,
  focusChangeCostGold,
  onChangeGuildFocus,
  onUpgradeTalent,
  roster,
  guildRelationships,
  guildActivityStats,
  guildOnlineSnapshot,
  missionList,
  onSelectCharacter,
}: GuildPageProps) {
  return (
    <PageGuildTalentsModal
      variant="page"
      isOpen
      guildProgress={guildProgress}
      guildGold={guildGold}
      guildDerivedStats={guildDerivedStats}
      guildSetup={guildSetup}
      currentDayIndex={currentDayIndex}
      focusChangeCostGold={focusChangeCostGold}
      onChangeGuildFocus={onChangeGuildFocus}
      onUpgradeTalent={onUpgradeTalent}
      roster={roster}
      guildRelationships={guildRelationships}
      guildActivityStats={guildActivityStats}
      guildOnlineSnapshot={guildOnlineSnapshot}
      missionList={missionList}
      onSelectCharacter={onSelectCharacter}
    />
  );
}
