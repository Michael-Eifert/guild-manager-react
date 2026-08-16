// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render as renderScreen,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import GuildSetupScreen from "../../components/GuildSetupScreen";
import { getRoleIcon } from "../../utils";
import {
  guildSetup,
  noop,
  render as renderHtml,
} from "./componentTestUtils";

afterEach(cleanup);

describe("GuildSetupScreen", () => {
  it("renders defaults and start gating", () => {
    const html = renderHtml(
      <GuildSetupScreen
        guildSetup={guildSetup}
        onChange={noop}
        onStart={noop}
        onLoadSession={noop}
      />,
    );

    expect(html).toContain("Found Your Guild");
    expect(html).toContain("Test Guild");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain("Alliance");
    expect(html).toContain("Horde");
    expect(html).toContain("Classic Era");
    expect(html).toContain("TBC Pre-Patch");
    expect(html).toContain('aria-label="Randomize guild name"');
    expect(html).toContain('aria-label="Randomize character name"');
    expect(html.indexOf("Faction")).toBeLessThan(
      html.indexOf("Founding Guild Master"),
    );
    expect(html).toContain("Starting Activity");
    expect(html).toContain("Play with Offline Simulation");
    expect(html).toContain("Officer Autonomy");
    expect(html).toContain("Guild Density");
    expect(html).toContain("Guild Dynamics");
    expect(html).toContain("Realm Age");
    expect(html).toContain("Starting Guild Progress");
    expect(html).toContain('aria-label="Officer Autonomy"');
    expect(html).toContain('checked=""');
    expect(html).toContain("Dungeon Groups");
    expect(html).toContain("PvP Activity");
    expect(html).toContain("Realm Competition");
    expect(html).toContain("Easy");
    expect(html).toContain("Normal");
    expect(html).toContain("Hard");
    expect(html).toContain("Start Game");
  });

  it("unlocks stronger guild starts only when the realm is old enough", () => {
    const Harness = () => {
      const [setup, setSetup] = React.useState(guildSetup);
      return (
        <GuildSetupScreen
          guildSetup={setup}
          onChange={(field, value) =>
            setSetup((current) => ({ ...current, [field]: value }))
          }
          onStart={noop}
          onLoadSession={noop}
        />
      );
    };

    renderScreen(<Harness />);

    const bwlReady = screen.getByRole("button", { name: /BWL Ready/ });
    expect((bwlReady as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole("slider", { name: "Realm Age" }), {
      target: { value: "10" },
    });
    expect((bwlReady as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(bwlReady);
    expect(
      screen.getByRole("slider", { name: "Starting Guild Progress" }),
    ).toHaveProperty("value", "6");

    fireEvent.change(screen.getByRole("slider", { name: "Realm Age" }), {
      target: { value: "2" },
    });
    expect(
      screen.getByRole("slider", { name: "Starting Guild Progress" }),
    ).toHaveProperty("value", "2");
  });

  it("uses visual founder choices and updates race portraits with gender", () => {
    const Harness = () => {
      const [setup, setSetup] = React.useState(guildSetup);
      return (
        <GuildSetupScreen
          guildSetup={setup}
          onChange={(field, value) =>
            setSetup((current) => ({ ...current, [field]: value }))
          }
          onStart={noop}
          onLoadSession={noop}
        />
      );
    };

    renderScreen(<Harness />);

    const raceGroup = screen.getByRole("radiogroup", {
      name: "Guild master race",
    });
    const humanButton = screen.getByRole("radio", { name: "Human" });
    expect(raceGroup.contains(humanButton)).toBe(true);
    expect(humanButton.querySelector("img")?.getAttribute("src")).toContain(
      "achievement_character_human_male",
    );

    const femaleButton = screen.getByRole("radio", { name: "Female" });
    expect(femaleButton.querySelector("svg")).toBeTruthy();
    fireEvent.click(femaleButton);
    expect(humanButton.querySelector("img")?.getAttribute("src")).toContain(
      "achievement_character_human_female",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Night Elf" }));
    expect(
      screen
        .getByRole("radio", { name: "Night Elf" })
        .querySelector("img")
        ?.getAttribute("src"),
    ).toContain("achievement_character_nightelf_female");

    const classGroup = screen.getByRole("radiogroup", {
      name: "Guild master class",
    });
    expect(classGroup).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Druid" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Paladin" })).toBeNull();
    expect(
      screen
        .getByRole("radio", { name: "Warrior" })
        .querySelector("img")
        ?.getAttribute("src"),
    ).toContain("classicon_warrior");

    const roleGroup = screen.getByRole("radiogroup", {
      name: "Guild master role",
    });
    expect(roleGroup).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Tank" }).textContent,
    ).toContain(getRoleIcon("Tank"));
  });

  it("unlocks Draenei founder choices only for the TBC pre-patch route", () => {
    const Harness = () => {
      const [setup, setSetup] = React.useState(guildSetup);
      return (
        <GuildSetupScreen
          guildSetup={setup}
          onChange={(field, value) =>
            setSetup((current) => ({ ...current, [field]: value }))
          }
          onStart={noop}
          onLoadSession={noop}
        />
      );
    };

    renderScreen(<Harness />);
    expect(screen.queryByRole("radio", { name: "Draenei" })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /TBC Pre-Patch/ }));
    expect(screen.getByRole("radio", { name: "Draenei" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Draenei" }));
    expect(screen.getByRole("radio", { name: "Shaman" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Paladin" })).toBeTruthy();
  });
});
