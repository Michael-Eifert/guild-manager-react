// @vitest-environment jsdom

import {
  BookOpen,
  Castle,
  GitBranch,
  Home,
  Map,
  MessageCircle,
  ScrollText,
  Shield,
  UserPlus,
} from "lucide-react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import AppShell, {
  MOBILE_QUICK_NAVIGATION_STORAGE_KEY,
} from "../../components/shell/AppShell";
import type { NavigationItem } from "../../components/shell/navigationTypes";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const createNavigationItems = (): NavigationItem[] => [
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    group: "overview",
    kind: "route",
    to: "/home/chat",
    badge: 4,
  },
  {
    id: "home",
    label: "Home",
    icon: Home,
    group: "overview",
    kind: "route",
    to: "/home",
    mobileFixed: true,
    mobileOrder: 1,
  },
  {
    id: "guild",
    label: "Guild",
    icon: Shield,
    group: "overview",
    kind: "route",
    to: "/home/guild",
    mobileDefault: true,
    mobileOrder: 2,
  },
  {
    id: "guild-relations",
    label: "Guild Relations",
    shortLabel: "Relations",
    icon: GitBranch,
    group: "overview",
    kind: "route",
    to: "/home/guild-relations",
    mobileDefault: true,
    mobileOrder: 3,
  },
  {
    id: "missions",
    label: "Missions",
    icon: ScrollText,
    group: "activities",
    kind: "route",
    to: "/home/mission-board",
  },
  {
    id: "adventure",
    label: "Adventure Board",
    shortLabel: "Adventure",
    icon: Map,
    group: "activities",
    kind: "route",
    to: "/home/adventure-board",
  },
  {
    id: "recruit",
    label: "Recruit",
    icon: UserPlus,
    group: "overview",
    kind: "route",
    to: "/home/recruit",
    badge: 2,
    badgeTone: "amber",
    mobileDefault: true,
    mobileOrder: 4,
  },
  {
    id: "realm",
    label: "Realm",
    icon: Castle,
    group: "world",
    kind: "route",
    to: "/home/realm",
  },
  {
    id: "database",
    label: "Database",
    icon: BookOpen,
    group: "tools",
    kind: "route",
    to: "/home/database",
  },
];

const renderShell = (items: NavigationItem[]) =>
  render(
    <MemoryRouter initialEntries={["/home/guild"]}>
      <AppShell header={<div>Guild status</div>} navigationItems={items}>
        <div>Page content</div>
      </AppShell>
    </MemoryRouter>,
  );

describe("AppShell", () => {
  it("renders grouped desktop navigation and marks the active route", () => {
    renderShell(createNavigationItems());

    const desktopNavigation = screen.getByTestId("desktop-navigation");
    const guildLink = within(desktopNavigation).getByRole("link", {
      name: "Guild",
    });

    expect(guildLink.getAttribute("aria-current")).toBe("page");
    expect(within(desktopNavigation).getByText("Overview")).toBeTruthy();
    expect(
      within(desktopNavigation).getByRole("link", { name: "Recruit" }),
    ).toBeTruthy();
    expect(within(desktopNavigation).getByText("2")).toBeTruthy();
  });

  it("uses Home, Guild, Guild Relations and Recruit as the default mobile navigation", () => {
    renderShell(createNavigationItems());

    const mobileNavigation = screen.getByTestId("mobile-navigation");
    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(4);
    expect(within(mobileNavigation).getAllByRole("button")).toHaveLength(1);
    expect(
      within(mobileNavigation)
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label")),
    ).toEqual(["Home", "Guild", "Guild Relations", "Recruit"]);
    expect(
      within(mobileNavigation)
        .getByRole("button", { name: "More navigation" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("opens the More drawer and closes it after route navigation", async () => {
    const user = userEvent.setup();
    renderShell(createNavigationItems());

    await user.click(
      within(screen.getByTestId("mobile-navigation")).getByRole("button", {
        name: "More navigation",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "More navigation" });
    expect(
      within(dialog).getByRole("link", { name: "Missions" }),
    ).toBeTruthy();

    expect(within(dialog).queryByText("Settings")).toBeNull();
    await user.click(within(dialog).getByRole("link", { name: "Database" }));

    expect(screen.queryByRole("dialog", { name: "More navigation" })).toBeNull();
  });

  it("lets the player choose and save three mobile shortcuts", async () => {
    const user = userEvent.setup();
    renderShell(createNavigationItems());

    await user.click(
      within(screen.getByTestId("mobile-navigation")).getByRole("button", {
        name: "More navigation",
      }),
    );
    const dialog = screen.getByRole("dialog", { name: "More navigation" });
    await user.click(
      within(dialog).getByRole("button", {
        name: "Customize quick access",
      }),
    );

    expect(
      within(dialog).getByRole("button", { name: "Guild" }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    await user.click(within(dialog).getByRole("button", { name: "Guild" }));
    await user.click(within(dialog).getByRole("button", { name: "Chat" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog", { name: "More navigation" })).toBeNull();
    expect(
      within(screen.getByTestId("mobile-navigation"))
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label")),
    ).toEqual(["Home", "Guild Relations", "Recruit", "Chat"]);
    expect(
      JSON.parse(
        window.localStorage.getItem(
          MOBILE_QUICK_NAVIGATION_STORAGE_KEY,
        ) || "[]",
      ),
    ).toEqual(["guild-relations", "recruit", "chat"]);
  });

  it("restores the saved shortcut order from local storage", () => {
    window.localStorage.setItem(
      MOBILE_QUICK_NAVIGATION_STORAGE_KEY,
      JSON.stringify(["database", "missions", "realm"]),
    );

    renderShell(createNavigationItems());

    expect(
      within(screen.getByTestId("mobile-navigation"))
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label")),
    ).toEqual(["Home", "Database", "Missions", "Realm"]);
  });

  it("opens the medium-desktop chat overlay and shows unread messages", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AppShell
          header={<div>Guild status</div>}
          navigationItems={createNavigationItems()}
          chatPanel={<div>Chat content</div>}
          chatUnreadCount={7}
        >
          <div>Page content</div>
        </AppShell>
      </MemoryRouter>,
    );

    const launcher = screen.getByRole("button", {
      name: "Open character chat",
    });
    expect(within(launcher).getByText("7")).toBeTruthy();
    await user.click(launcher);
    expect(
      screen.getByRole("dialog", { name: "Character chat" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Close character chat" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Character chat" }),
    ).toBeNull();
  });

  it("does not duplicate supplemental chat UI on the full chat route", () => {
    render(
      <MemoryRouter initialEntries={["/home/chat"]}>
        <AppShell
          header={<div>Guild status</div>}
          navigationItems={createNavigationItems()}
          chatPanel={<div>Dock chat content</div>}
          chatUnreadCount={7}
        >
          <div>Full chat page</div>
        </AppShell>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("button", { name: "Open character chat" }),
    ).toBeNull();
    expect(screen.queryByText("Dock chat content")).toBeNull();
    expect(screen.getByText("Full chat page")).toBeTruthy();
  });
});
