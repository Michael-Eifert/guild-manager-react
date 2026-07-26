// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ActivityPanelLayout from "../../components/dashboard/ActivityPanelLayout";

const panel = (name: string) => <div>{name}</div>;

const renderLayout = (
  sectionsOpen = {
    guildActivity: true,
    pvpActivity: false,
    dungeonGroups: true,
    guildComposition: false,
  },
  onSetAllOpen = vi.fn(),
) => {
  render(
    <ActivityPanelLayout
      sectionsOpen={sectionsOpen}
      onSetAllOpen={onSetAllOpen}
      guildActivity={panel("Guild Activity panel")}
      pvpActivity={panel("PvP Activity panel")}
      dungeonGroups={panel("Dungeon Groups panel")}
      guildComposition={panel("Guild Composition panel")}
    />,
  );
  return onSetAllOpen;
};

afterEach(cleanup);

describe("ActivityPanelLayout", () => {
  it("keeps the mobile order while defining two independent desktop columns", () => {
    renderLayout();

    const columns = screen.getByTestId("activity-panel-columns");
    const left = screen.getByTestId("activity-panel-column-left");
    const right = screen.getByTestId("activity-panel-column-right");

    expect(columns.className).toContain("xl:grid-cols-2");
    expect(left.className).toContain("xl:flex");
    expect(right.className).toContain("xl:flex");
    expect(left.textContent).toBe("Guild Activity panelDungeon Groups panel");
    expect(right.textContent).toBe("PvP Activity panelGuild Composition panel");
    expect(screen.getByText("Guild Activity panel").parentElement?.className).toContain(
      "order-1",
    );
    expect(screen.getByText("PvP Activity panel").parentElement?.className).toContain(
      "order-2",
    );
    expect(screen.getByText("Dungeon Groups panel").parentElement?.className).toContain(
      "order-3",
    );
    expect(
      screen.getByText("Guild Composition panel").parentElement?.className,
    ).toContain("order-4");
  });

  it("expands and collapses all panels through the shared action", async () => {
    const user = userEvent.setup();
    const onSetAllOpen = renderLayout();

    await user.click(screen.getByRole("button", { name: "Expand all" }));
    await user.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(onSetAllOpen).toHaveBeenNthCalledWith(1, true);
    expect(onSetAllOpen).toHaveBeenNthCalledWith(2, false);
  });

  it("disables bulk actions that would have no effect", () => {
    const { rerender } = render(
      <ActivityPanelLayout
        sectionsOpen={{
          guildActivity: true,
          pvpActivity: true,
          dungeonGroups: true,
          guildComposition: true,
        }}
        onSetAllOpen={vi.fn()}
        guildActivity={panel("Guild")}
        pvpActivity={panel("PvP")}
        dungeonGroups={panel("Dungeons")}
        guildComposition={panel("Composition")}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Expand all" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Collapse all" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    rerender(
      <ActivityPanelLayout
        sectionsOpen={{
          guildActivity: false,
          pvpActivity: false,
          dungeonGroups: false,
          guildComposition: false,
        }}
        onSetAllOpen={vi.fn()}
        guildActivity={panel("Guild")}
        pvpActivity={panel("PvP")}
        dungeonGroups={panel("Dungeons")}
        guildComposition={panel("Composition")}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Expand all" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Collapse all" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
