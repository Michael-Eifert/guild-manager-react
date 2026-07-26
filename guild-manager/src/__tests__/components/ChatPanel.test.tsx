// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("ChatPanel", () => {
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
    expect(screen.getAllByText("Guild").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("tab", { name: /General/ }));
    expect(screen.getByText("Borin")).toBeTruthy();
    expect(screen.getByText("Realm Regulars")).toBeTruthy();
    expect(onMarkRead).toHaveBeenCalledWith("general");
  });
});
