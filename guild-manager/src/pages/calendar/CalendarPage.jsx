import CalendarModal from "../../components/modals/CalendarModal";

export default function CalendarPage({
  calendarState,
  currentDayIndex,
  missionList,
  roster,
  activeMissions,
  raidLockouts,
  dungeonSuccessBonus,
  onCreateEvent,
  onCreateSeries,
  onUpdateEventRoster,
  onLockEventRoster,
  onCancelEvent,
  onCancelSeries,
  onStartEvent,
}) {
  return (
    <CalendarModal
      variant="page"
      isOpen
      calendarState={calendarState}
      currentDayIndex={currentDayIndex}
      missionList={missionList}
      roster={roster}
      activeMissions={activeMissions}
      raidLockouts={raidLockouts}
      dungeonSuccessBonus={dungeonSuccessBonus}
      onCreateEvent={onCreateEvent}
      onCreateSeries={onCreateSeries}
      onUpdateEventRoster={onUpdateEventRoster}
      onLockEventRoster={onLockEventRoster}
      onCancelEvent={onCancelEvent}
      onCancelSeries={onCancelSeries}
      onStartEvent={onStartEvent}
    />
  );
}
