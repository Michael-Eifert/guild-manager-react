import { expect, type Page } from "@playwright/test";

export const createGuild = async (
  page: Page,
  name = "Extended Test Guild",
) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Found Your Guild" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Name of Guild" }).fill(name);
  await page
    .getByRole("textbox", { name: "Character Name" })
    .fill("Testfounder");
  await page.getByRole("button", { name: "Start Game" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Guild Overview" }),
  ).toBeVisible();
};

export const expectNoHorizontalOverflow = async (page: Page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
};
