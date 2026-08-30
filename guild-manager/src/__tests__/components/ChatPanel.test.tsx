// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ChatPanel from "../../components/chat/ChatPanel";
import { createInitialSocialState } from "../../social/socialSimulation";

const socialState = {
  ...createInitialSocialState(),
  nextSequence: 3,
  messages: [
    {
      id: "chat:1",
      sequence: 1,
      channel: "guild" as const,
      intent: "lfg-request" as const,
      text: "Need help in The Deadmines.",
      fallbackText: "Need help in The Deadmines.",
      textSource: "template" as const,
      generationStatus: "ready" as const,
      gameTimeMs: 10,
      speaker: {
        id: "guild-1",
        source: "guild" as const,
        name: "Aria",
        role: "Healer",
        level: 20,
      },
    },
    {
      id: "chat:2",
      sequence: 2,
      channel: "general" as const,
      intent: "join" as const,
      text: "DPS here.",
      fallbackText: "DPS here.",
      textSource: "template" as const,
      generationStatus: "ready" as const,
      gameTimeMs: 20,
      speaker: {
        id: "realm-1",
        source: "realm" as const,
        name: "Borin",
        guildName: "Realm Regulars",
        role: "DPS",
        level: 20,
      },
    },
  ],
};

const formatExpectedTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChatPanel", () => {
  it("follows new messages while idle and pauses while the player reads older chat", () => {
    let scrollHeight = 480;
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
      () => scrollHeight,
    );
    const view = render(
      <ChatPanel
        socialState={socialState}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
        compact
      />,
    );
    const chat = screen.getByLabelText("Character chat");
    const messageList = screen.getByRole("log");
    expect(messageList.scrollTop).toBe(480);

    view.rerender(
      <ChatPanel
        socialState={{
          ...socialState,
          nextSequence: 4,
          messages: [
            ...socialState.messages,
            {
              ...socialState.messages[0],
              id: "chat:3",
              sequence: 3,
              text: "Newest guild message.",
              fallbackText: "Newest guild message.",
            },
          ],
        }}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
        compact
      />,
    );
    expect(messageList.scrollTop).toBe(480);

    fireEvent.pointerEnter(chat);
    messageList.scrollTop = 120;
    scrollHeight = 720;
    view.rerender(
      <ChatPanel
        socialState={{
          ...socialState,
          nextSequence: 5,
          messages: [
            ...socialState.messages,
            {
              ...socialState.messages[0],
              id: "chat:3",
              sequence: 3,
              text: "Newest guild message.",
              fallbackText: "Newest guild message.",
            },
            {
              ...socialState.messages[0],
              id: "chat:4",
              sequence: 4,
              text: "Another guild message.",
              fallbackText: "Another guild message.",
            },
          ],
        }}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
        compact
      />,
    );
    expect(messageList.scrollTop).toBe(120);

    fireEvent.pointerLeave(chat);
    expect(messageList.scrollTop).toBe(120);

    fireEvent.click(screen.getByRole("tab", { name: /General/ }));
    expect(messageList.scrollTop).toBe(720);
  });

  it("keeps its scroll position when the chat state rerenders without a new message", () => {
    let scrollHeight = 720;
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
      () => scrollHeight,
    );
    const view = render(
      <ChatPanel
        socialState={socialState}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
        compact
      />,
    );
    const messageList = screen.getByRole("log");
    messageList.scrollTop = 180;
    scrollHeight = 960;

    view.rerender(
      <ChatPanel
        socialState={{
          ...socialState,
          nextSequence: 4,
          // Simulates a paused-game update that keeps the chat history intact.
          messages: [...socialState.messages],
        }}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
        compact
      />,
    );

    expect(messageList.scrollTop).toBe(180);
  });

  it("keeps the message position while the log has keyboard focus", () => {
    const view = render(
      <ChatPanel
        socialState={socialState}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
      />,
    );
    const messageList = screen.getByRole("log");
    Object.defineProperty(messageList, "scrollHeight", {
      configurable: true,
      value: 600,
    });
    messageList.scrollTop = 90;
    fireEvent.focus(messageList);

    view.rerender(
      <ChatPanel
        socialState={{
          ...socialState,
          nextSequence: 4,
          messages: [
            ...socialState.messages,
            {
              ...socialState.messages[0],
              id: "chat:3",
              sequence: 3,
            },
          ],
        }}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
      />,
    );

    expect(messageList.scrollTop).toBe(90);
    fireEvent.blur(messageList);
    expect(messageList.scrollTop).toBe(90);
  });

  it("switches channels and clearly distinguishes guild and realm speakers", () => {
    const onMarkRead = vi.fn();
    render(
      <ChatPanel
        socialState={socialState}
        guildName="Test Guild"
        onMarkRead={onMarkRead}
      />,
    );

    expect(screen.getByText("Aria")).toBeTruthy();
    expect(screen.getByText(formatExpectedTimestamp(10))).toBeTruthy();
    expect(screen.getAllByText("Guild").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("tab", { name: /General/ }));
    expect(screen.getByText("Borin")).toBeTruthy();
    expect(screen.getByText(formatExpectedTimestamp(20))).toBeTruthy();
    expect(screen.getByText("Realm Regulars")).toBeTruthy();
    expect(onMarkRead).toHaveBeenCalledWith("general");
  });

  it("labels failed mission messages next to the guild identity", () => {
    render(
      <ChatPanel
        socialState={{
          ...socialState,
          nextSequence: 4,
          messages: [
            {
              ...socialState.messages[0],
              id: "chat:3",
              sequence: 3,
              intent: "mission-failed",
              text: "Damn, we did not get them. Hogger beat us this time.",
              fallbackText:
                "Damn, we did not get them. Hogger beat us this time.",
            },
          ],
        }}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
      />,
    );

    const messageText = screen.getByText(
      "Damn, we did not get them. Hogger beat us this time.",
    );
    const messageCard = messageText.closest("article");

    expect(messageCard).toBeTruthy();
    expect(within(messageCard!).getByText("Guild")).toBeTruthy();
    expect(within(messageCard!).getByText("Mission Failed")).toBeTruthy();
  });

  it("labels successful mission messages and celebrates the result", () => {
    render(
      <ChatPanel
        socialState={{
          ...socialState,
          nextSequence: 5,
          messages: [
            {
              ...socialState.messages[0],
              id: "chat:4",
              sequence: 4,
              intent: "mission-success",
              text: "Yes! We did it. Hogger is defeated!",
              fallbackText: "Yes! We did it. Hogger is defeated!",
            },
          ],
        }}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
      />,
    );

    const messageText = screen.getByText(
      "Yes! We did it. Hogger is defeated!",
    );
    const messageCard = messageText.closest("article");

    expect(messageCard).toBeTruthy();
    expect(within(messageCard!).getByText("Guild")).toBeTruthy();
    expect(
      within(messageCard!).getByText("Mission Accomplished"),
    ).toBeTruthy();
  });

  it("shows Tavern scenes and resolves a manual incident through its existing choice", () => {
    const onResolveIncident = vi.fn();
    const view = render(
      <ChatPanel
        socialState={{
          ...socialState,
          rpScenes: [
            {
              id: "rp:incident",
              sourceEventId: "incident:1",
              kind: "guild-incident",
              tag: "Mission Blame",
              priority: 3,
              status: "awaiting-choice",
              createdAt: 0,
              nextTurnAt: 0,
              participants: [],
              turns: [],
              nextTurnIndex: 2,
              incidentId: "incident-1",
              interactive: true,
            },
          ],
          messages: [
            {
              ...socialState.messages[0],
              id: "chat:rp",
              sequence: 3,
              channel: "tavern",
              intent: "rp-defense",
              contentKind: "roleplay",
              text: "Let us review what actually happened.",
              fallbackText: "Let us review what actually happened.",
              sceneId: "rp:incident",
              sceneTag: "Mission Blame",
              incidentId: "incident-1",
            },
          ],
        }}
        guildName="Test Guild"
        onMarkRead={vi.fn()}
        managementMode="manual"
        incidents={[
          {
            id: "incident-1",
            kind: "blame",
            title: "Mission Blame",
            description: "A failed run caused an argument.",
            actorId: "guild-1",
            subjectId: "guild-2",
            dayIndex: 1,
            expiresDayIndex: 2,
            source: "mission",
            status: "pending",
            choices: [
              {
                id: "mediate",
                label: "Review the run",
                description: "Turn blame into a constructive debrief.",
                relationshipDelta: 5,
                moraleDelta: 2,
                target: "both",
              },
            ],
          },
        ]}
        onResolveIncident={onResolveIncident}
      />,
    );

    fireEvent.click(
      within(view.container).getByRole("tab", { name: /Tavern RP/ }),
    );
    expect(within(view.container).getByText("Mission Blame")).toBeTruthy();
    fireEvent.click(
      within(view.container).getByRole("button", { name: /Review the run/ }),
    );
    expect(onResolveIncident).toHaveBeenCalledWith("incident-1", "mediate");
  });
});
