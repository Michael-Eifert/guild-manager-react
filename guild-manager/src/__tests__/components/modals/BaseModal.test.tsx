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

  it("renders inline page content without dialog semantics", () => {
    const html = render(
      <BaseModal
        isOpen
        variant="page"
        ariaLabel="Guild tool"
        pageClassName="page-panel"
      >
        <div>Page child</div>
      </BaseModal>,
    );

    expect(html).toContain("<section");
    expect(html).toContain('aria-label="Guild tool"');
    expect(html).toContain('class="page-panel"');
    expect(html).not.toContain('role="dialog"');
  });
});
