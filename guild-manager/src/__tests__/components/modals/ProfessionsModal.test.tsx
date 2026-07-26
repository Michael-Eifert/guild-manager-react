import React from "react";
import { describe, expect, it } from "vitest";

import ProfessionsModal from "../../../components/modals/ProfessionsModal";
import { render, noop } from "../componentTestUtils";

describe("ProfessionsModal", () => {
  it("renders overview, crafting entry points, and stash context", () => {
    const html = render(
      <ProfessionsModal
        isOpen
        variant="page"
        onClose={noop}
        roster={[
          {
            id: "tailor-1",
            name: "Lunalis",
            charClass: "Mage",
            level: 20,
            professions: [{ name: "Tailoring", skill: 1 }],
            equipment: {},
          },
        ]}
        guildInventory={{
          items: {
            linen_cloth: 6,
            simple_thread: 1,
          },
        }}
        guildGold={12}
        onCraftRecipe={noop}
        onSellStashItem={noop}
        onCleanupGuildStash={noop}
        onTryAutoEquipFromGuildStash={noop}
      />,
    );

    expect(html).toContain("Professions");
    expect(html).toContain("Guild Stash");
    expect(html).toContain("Lunalis");
    expect(html).toContain("Tailoring");
    expect(html).not.toContain('role="dialog"');
  });
});
