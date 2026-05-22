import React from "react";
import { describe, expect, it } from "vitest";

import BaseModal from "../../../components/modals/BaseModal";
import { noop, render } from "../componentTestUtils";

describe("BaseModal", () => {
  it("renders children only while open", () => {
    expect(
      render(
        <BaseModal isOpen={false} onClose={noop}>
          <div>Closed child</div>
        </BaseModal>,
      ),
    ).toBe("");
    expect(
      render(
        <BaseModal isOpen onClose={noop} panelClassName="panel">
          <div>Open child</div>
        </BaseModal>,
      ),
    ).toContain("Open child");
  });
});
