// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render as renderScreen,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GuildSetupScreen from "../../components/GuildSetupScreen";
import { getRoleIcon } from "../../utils";
import {
  guildSetup,
  noop,
  render as renderHtml,
} from "./componentTestUtils";

afterEach(cleanup);

describe("GuildSetupScreen", () => {
  it("renders the destiny page, stepper, and persistent summary", () => {
    const html = renderHtml(
      <GuildSetupScreen
        guildSetup={guildSetup}
        onChange={noop}
        onStart={noop}
        onLoadSession={noop}
      />,
    );

    expect(html).toContain("Found Your Guild");
    expect(html).toContain("Choose the Destiny of Your Guild");
    expect(html).toContain("What Experience Do You Choose?");
    expect(html).toContain("Test Guild");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('role="radio"');
    expect(html).toContain("Alliance");
    expect(html).toContain("Horde");
    expect(html).toContain("Classic Era");
    expect(html).toContain("TBC Pre-Patch");
    expect(html).toContain('aria-label="Randomize guild name"');
    expect(html).toContain("Guild Focus");
    expect(html).toContain("Your Chronicle So Far");
    expect(html).toContain("Not chosen yet");
    expect(html).toContain("Continue");
    expect(html).not.toContain('aria-label="Randomize character name"');
    expect(html).not.toContain("Starting Activity");
    expect(html).not.toContain("Realm Age");
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

    fireEvent.click(
      screen.getByRole("button", { name: /Realm: Not visited/ }),
    );

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

    fireEvent.click(
      screen.getByRole("button", { name: /Guild Master: Not visited/ }),
    );

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
    fireEvent.click(
      screen.getByRole("button", { name: /Guild Master: Not visited/ }),
    );
    expect(screen.getByRole("radio", { name: "Draenei" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Draenei" }));
    expect(screen.getByRole("radio", { name: "Shaman" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Paladin" })).toBeTruthy();
  });

  it("supports guided and direct navigation with visited completion states", () => {
    const Harness = () => {
      const [setup, setSetup] = React.useState({ ...guildSetup, name: "" });
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

    expect(
      screen
        .getByRole("button", { name: "Guild Destiny: Needs attention" })
        .getAttribute("data-step-status"),
    ).toBe("incomplete");
    expect(
      screen
        .getByRole("button", { name: "Realm: Not visited" })
        .getAttribute("data-step-status"),
    ).toBe("unvisited");

    fireEvent.click(
      screen.getByRole("button", { name: "Guild Master: Not visited" }),
    );
    expect(screen.getByText("Founding Guild Master")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Guild Master: Needs attention" })
        .getAttribute("data-step-status"),
    ).toBe("incomplete");

    fireEvent.change(screen.getByLabelText("Character Name"), {
      target: { value: "Aegwynn" },
    });
    expect(
      screen
        .getByRole("button", { name: "Guild Master: Complete" })
        .getAttribute("data-step-status"),
    ).toBe("complete");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Choose Your Realm")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Founding Guild Master")).toBeTruthy();
  });

  it("updates the chronicle and only founds the guild from the final page", () => {
    const onStart = vi.fn();
    const Harness = () => {
      const [setup, setSetup] = React.useState({ ...guildSetup, name: "" });
      return (
        <GuildSetupScreen
          guildSetup={setup}
          onChange={(field, value) =>
            setSetup((current) => ({ ...current, [field]: value }))
          }
          onStart={onStart}
          onLoadSession={noop}
        />
      );
    };

    renderScreen(<Harness />);
    const summary = screen.getByRole("region", {
      name: "Your Chronicle So Far",
    });
    expect(within(summary).getAllByText("Not chosen yet")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Name of Guild"), {
      target: { value: "Moonwatch" },
    });
    expect(within(summary).getByText("Moonwatch")).toBeTruthy();

    fireEvent.submit(screen.getByRole("button", { name: "Continue" }).closest("form")!);
    expect(screen.getByText("Founding Guild Master")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Character Name"), {
      target: { value: "Elowen" },
    });
    expect(within(summary).getByText("Elowen")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Gameplay: Not visited" }),
    );
    expect(screen.getByText("Gameplay Settings")).toBeTruthy();
    expect(screen.getByText("Starting Activity")).toBeTruthy();
    expect(screen.getByText("Play with Offline Simulation")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Found Guild" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Found Guild" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
