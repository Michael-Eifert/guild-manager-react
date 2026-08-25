import { expect, test } from "@playwright/test";

import {
  createGuild,
  expectNoHorizontalOverflow,
} from "./helpers/gameSetup";

test("@responsive starts a guild without page overflow", async ({
  page,
}, testInfo) => {
  await createGuild(page, `Responsive ${testInfo.project.name}`);

  await expect(page.getByRole("main")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const shellCanScroll = await page.locator(".app-shell-main").evaluate(
    (element) => element.scrollHeight > element.clientHeight,
  );
  expect(shellCanScroll).toBe(true);
});

test("@desktop navigates page-based tools without stale dialogs", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await createGuild(page, "Desktop Navigation Guild");

  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(page).toHaveURL(/\/home\/calendar$/);
  await expect(
    page.getByRole("heading", { name: "Guild Calendar" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Guild Log", exact: true }).click();
  await expect(page).toHaveURL(/\/home\/guild-log$/);
  await expect(page.getByRole("heading", { name: "Guild Log" })).toBeVisible();

  await page.getByRole("link", { name: "Database", exact: true }).click();
  await expect(page).toHaveURL(/\/home\/database$/);
  await expect(page.getByRole("heading", { name: "Loot Atlas" })).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "Guild Overview" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("@mobile exposes default quick access and a scrollable More drawer", async ({
  page,
}) => {
  await createGuild(page, "Mobile Navigation Guild");

  const mobileNavigation = page.getByTestId("mobile-navigation");
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Guild", exact: true }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Guild Relations", exact: true }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Recruit", exact: true }),
  ).toBeVisible();

  await mobileNavigation
    .getByRole("button", { name: "More navigation" })
    .click();
  const moreDialog = page.getByRole("dialog", { name: "More navigation" });
  await expect(moreDialog).toBeVisible();
  await moreDialog
    .getByRole("button", { name: "Customize quick access" })
    .click();

  const shortcuts = moreDialog.locator(
    '[aria-label="Available mobile shortcuts"]',
  );
  await expect(
    shortcuts.getByRole("button", { name: "Guild", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    shortcuts.getByRole("button", { name: "Guild Relations", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    shortcuts.getByRole("button", { name: "Recruit", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expectNoHorizontalOverflow(page);
});
