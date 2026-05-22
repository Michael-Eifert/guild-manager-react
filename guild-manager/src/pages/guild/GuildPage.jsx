import GuildTalentsModal from "../../components/modals/GuildTalentsModal";

export default function GuildPage({
  guildProgress,
  guildGold,
  guildDerivedStats,
  guildSetup,
  currentDayIndex,
  focusChangeCostGold,
  onChangeGuildFocus,
  onUpgradeTalent,
}) {
  return (
    <GuildTalentsModal
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
    />
  );
}
