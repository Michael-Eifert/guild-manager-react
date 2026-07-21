import type { ComponentType } from "react";

import CalendarModal from "../../components/modals/CalendarModal";
import type { Character } from "../../types/characterTypes";
import type { Mission } from "../../types/missionTypes";

type ForwardedCallback = (...args: never[]) => unknown;

type CalendarPageProps = {
  calendarState: Record<string, unknown>;
  currentDayIndex: number;
  missionList: Mission[];
  roster: Character[];
  activeMissions: Mission[];
  raidLockouts: Record<string, unknown>;
  dungeonSuccessBonus: number;
  onCreateEvent: ForwardedCallback;
  onCreateSeries: ForwardedCallback;
  onUpdateEventRoster: ForwardedCallback;
  onLockEventRoster: ForwardedCallback;
  onCancelEvent: ForwardedCallback;
  onCancelSeries: ForwardedCallback;
  onStartEvent: ForwardedCallback;
};

// Temporary adapter until CalendarModal itself is migrated from JSX.
const PageCalendarModal = CalendarModal as ComponentType<
  CalendarPageProps & { isOpen: true; variant: "page" }
>;

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
}: CalendarPageProps) {
  return (
    <PageCalendarModal
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
