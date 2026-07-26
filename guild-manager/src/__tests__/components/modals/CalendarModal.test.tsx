import React from "react";
import { describe, expect, it } from "vitest";

import CalendarModal from "../../../components/modals/CalendarModal";
import {
  CALENDAR_STATUS,
  noop,
  raidMission,
  render,
  roster,
} from "../componentTestUtils";

describe("CalendarModal", () => {
  it("renders an empty calendar before raid missions or events are available", () => {
    const html = render(
      <CalendarModal
        isOpen
        variant="page"
        onClose={noop}
        calendarState={{
          calendarEvents: [],
          calendarSeries: [],
        }}
        currentDayIndex={0}
        missionList={[]}
        roster={roster}
        activeMissions={[]}
        raidLockouts={{}}
        onCreateEvent={noop}
        onCreateSeries={noop}
        onUpdateEventRoster={noop}
        onLockEventRoster={noop}
        onCancelEvent={noop}
        onCancelSeries={noop}
        onStartEvent={noop}
      />,
    );

    expect(html).toContain("Guild Calendar");
    expect(html).toContain("No raid events planned.");
  });

  it("renders raid scheduling controls", () => {
    const html = render(
      <CalendarModal
        isOpen
        variant="page"
        onClose={noop}
        calendarState={{
          calendarEvents: [
            {
              id: "event-1",
              title: "Molten Core Night",
              missionId: raidMission.id,
              missionIds: [raidMission.id],
              scheduledDayIndex: 1,
              scheduledTimeOfDay: "evening",
              status: CALENDAR_STATUS.READY,
              registrations: ["hero-1"],
              approvedRosterIds: ["hero-1"],
            },
          ],
          calendarSeries: [],
        }}
        currentDayIndex={0}
        missionList={[raidMission]}
        roster={roster}
        activeMissions={[]}
        raidLockouts={{}}
        onCreateEvent={noop}
        onCreateSeries={noop}
        onUpdateEventRoster={noop}
        onLockEventRoster={noop}
        onCancelEvent={noop}
        onCancelSeries={noop}
        onStartEvent={noop}
      />,
    );

    expect(html).toContain("Guild Calendar");
    expect(html).toContain("Molten Core Night");
    expect(html).toContain("Upcoming Events");
    expect(html).not.toContain('role="dialog"');
  });
});
