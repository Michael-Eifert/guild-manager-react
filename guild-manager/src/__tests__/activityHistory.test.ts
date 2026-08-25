import { describe, expect, it } from "vitest";

import {
  ACTIVITY_EVENT_LIMIT_PER_RUN,
  ACTIVITY_HISTORY_LIMIT_PER_KIND,
  appendActivityRun,
  createBattlegroundActivityRun,
  createMissionActivityRun,
  ensureActivityHistory,
} from "../activity/activityHistory";
import { normalizeContentState } from "../content/contentState";

const contentState = normalizeContentState(null);

describe("activity history", () => {
  it("archives dungeon boss attempts and preparation", () => {
    const record = createMissionActivityRun({
      mission: {
        instanceId: "run:one",
        id: "deadmines",
        name: "The Deadmines",
        type: "dungeon",
        startTime: 100,
        memberIds: ["tank"],
        calendarEventId: "calendar:one",
        consumableSummary: "Food x5",
        dungeonProgress: {
          clearedSteps: 1,
          stepResults: [
            { step: 1, bossName: "Rhahk'Zor", outcome: "cleared" },
            { step: 2, bossName: "Sneed", outcome: "failed" },
          ],
        },
      },
      roster: [{ id: "tank", name: "Bulwark", role: "Tank", level: 20 }],
      succeeded: false,
      completedAtGameTimeMs: 500,
      dayIndex: 3,
      contentState,
    });

    expect(record).toMatchObject({
      id: "run:one",
      kind: "dungeon",
      source: "calendar",
      outcome: "failure",
      details: { wipeCount: 1, preparationSummary: "Food x5" },
    });
    expect(record?.events).toHaveLength(2);
    expect(record?.participants[0].name).toBe("Bulwark");
  });

  it("caps records per activity type and battleground events", () => {
    let history = ensureActivityHistory(null);
    for (let index = 0; index < ACTIVITY_HISTORY_LIMIT_PER_KIND + 5; index += 1) {
      history = appendActivityRun(
        history,
        createBattlegroundActivityRun({
          battle: {
            id: `wsg:${index}`,
            battlefieldId: "warsong_gulch",
            name: "Warsong Gulch",
            startTime: index,
            completedAt: index + 1,
            result: "victory",
            participantIds: [],
            events: Array.from(
              { length: ACTIVITY_EVENT_LIMIT_PER_RUN + 10 },
              (_, eventIndex) => ({ summary: `Event ${eventIndex}` }),
            ),
          },
          roster: [],
          contentState,
          dayIndex: index,
        }),
      );
    }
    expect(history.records).toHaveLength(ACTIVITY_HISTORY_LIMIT_PER_KIND);
    expect(history.records[0].events).toHaveLength(ACTIVITY_EVENT_LIMIT_PER_RUN);
  });
});
