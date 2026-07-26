import { expect, test } from "@playwright/test";

test("@desktop loads and displays a forming mixed dungeon group", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles("tests/e2e/fixtures/lfg-forming-session-v9.json");

  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("heading", { name: "LFG Fixture Guild" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Dungeon Board", exact: true }).click();

  await expect(page).toHaveURL(/\/home\/dungeon-board$/);
  const group = page.getByRole("article", {
    name: "The Deadmines group forming",
  });
  await expect(group).toBeVisible();
  await expect(group).toContainText("Group Forming · 2/5");
  await expect(group).toContainText("Guild Tank");
  await expect(group).toContainText("Realm Healer");
  await expect(group).toContainText("Guild");
  await expect(group).toContainText("Realm");
  await expect(group).toContainText("Free Agent");
});
