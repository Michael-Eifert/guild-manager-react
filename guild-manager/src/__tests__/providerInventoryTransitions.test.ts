import { describe, expect, it } from "vitest";

import { cleanGuildStash, sellGuildStashItem } from "../inventory/providerInventoryTransitions";

describe("provider inventory transitions", () => {
  it("does not sell missing stash items", () => {
    expect(sellGuildStashItem({ itemId: "missing", guildInventory: { items: {} }, guildGold: 5 })).toBeNull();
  });

  it("keeps cleanup gold accounting explicit", () => {
    const result = cleanGuildStash({
      roster: [],
      guildInventory: { items: {} },
      stashPolicy: {},
      guildGold: 12,
    });
    expect(result.guildGold).toBe(12 + result.goldGained);
  });
});
