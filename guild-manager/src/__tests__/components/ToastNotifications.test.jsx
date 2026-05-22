import React from "react";
import { describe, expect, it } from "vitest";

import ToastNotifications from "../../components/ToastNotifications";
import { noop, render } from "./componentTestUtils";

describe("ToastNotifications", () => {
  it("renders only when notifications exist", () => {
    const emptyHtml = render(
      <ToastNotifications notifications={[]} onDismiss={noop} />,
    );
    const html = render(
      <ToastNotifications
        notifications={[
          {
            id: "toast-1",
            type: "achievement",
            title: "Milestone",
            message: "First dungeon clear",
          },
        ]}
        onDismiss={noop}
      />,
    );

    expect(emptyHtml).toBe("");
    expect(html).toContain("Milestone");
    expect(html).toContain("First dungeon clear");
  });
});
