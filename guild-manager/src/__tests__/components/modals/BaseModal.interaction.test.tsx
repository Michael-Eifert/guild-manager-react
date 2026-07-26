// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import BaseModal from "../../../components/modals/BaseModal";

afterEach(cleanup);

describe("BaseModal interactions", () => {
  it("closes from Escape and the backdrop while preserving panel clicks", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <BaseModal isOpen onClose={onClose} ariaLabel="Test dialog">
        <button type="button">Inside</button>
      </BaseModal>,
    );

    expect(screen.getByRole("dialog", { name: "Test dialog" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("dialog").parentElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("traps focus and restores it when closed", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { rerender } = render(
      <BaseModal isOpen onClose={() => {}}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </BaseModal>,
    );

    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });
    expect(document.activeElement).toBe(first);
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    rerender(<BaseModal isOpen={false} onClose={() => {}} />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("preserves focus and scroll position when callbacks change while open", () => {
    const firstOnClose = vi.fn();
    const latestOnClose = vi.fn();
    const { rerender } = render(
      <BaseModal isOpen onClose={firstOnClose} ariaLabel="Stable dialog">
        <button type="button">First</button>
        <button type="button">Keep focus</button>
      </BaseModal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Stable dialog" });
    const focusedButton = screen.getByRole("button", { name: "Keep focus" });
    focusedButton.focus();
    dialog.scrollTop = 120;

    rerender(
      <BaseModal isOpen onClose={latestOnClose} ariaLabel="Stable dialog">
        <button type="button">First</button>
        <button type="button">Keep focus</button>
      </BaseModal>,
    );

    expect(document.activeElement).toBe(focusedButton);
    expect(dialog.scrollTop).toBe(120);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(firstOnClose).not.toHaveBeenCalled();
    expect(latestOnClose).toHaveBeenCalledTimes(1);
  });

  it("locks and restores the app scroll container while open", () => {
    const shellScroller = document.createElement("div");
    shellScroller.className = "app-shell-main";
    shellScroller.style.overflow = "auto";
    document.body.appendChild(shellScroller);

    const { rerender } = render(
      <BaseModal isOpen onClose={() => {}}>
        <button type="button">Inside</button>
      </BaseModal>,
    );

    expect(shellScroller.style.overflow).toBe("hidden");

    rerender(<BaseModal isOpen={false} onClose={() => {}} />);

    expect(shellScroller.style.overflow).toBe("auto");
    shellScroller.remove();
  });
});
