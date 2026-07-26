import { expect, test } from "@playwright/test";

import { createGuild } from "./helpers/gameSetup";

test("@desktop keeps activity panels independent and supports bulk actions", async ({
  page,
}) => {
  await createGuild(page, "Activity Test Guild");

  const activityRegion = page.getByRole("region", {
    name: "Activity controls",
  });
  const guildActivity = activityRegion.getByRole("button", {
    name: /Guild Activity/,
  });
  const pvpActivity = activityRegion.getByRole("button", {
    name: /PvP Activity/,
  });

  await activityRegion
    .getByRole("button", { name: "Collapse all", exact: true })
    .click();
  await expect(guildActivity).toHaveAttribute("aria-expanded", "false");
  await expect(pvpActivity).toHaveAttribute("aria-expanded", "false");
  await expect(
    activityRegion.getByRole("button", {
      name: "Collapse all",
      exact: true,
    }),
  ).toBeDisabled();

  await guildActivity.click();
  await expect(guildActivity).toHaveAttribute("aria-expanded", "true");
  await expect(pvpActivity).toHaveAttribute("aria-expanded", "false");

  await activityRegion
    .getByRole("button", { name: "Expand all", exact: true })
    .click();
  await expect(
    activityRegion.getByRole("button", { name: "Expand all", exact: true }),
  ).toBeDisabled();
});
