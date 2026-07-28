// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SaveLoadModal from "../../components/modals/SaveLoadModal";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("SaveLoadModal", () => {
  it("remembers an optional export filename and passes it to save", () => {
    const onClose = vi.fn();
    const onSaveSession = vi.fn();
    const onLoadSession = vi.fn();
    render(
      <SaveLoadModal
        isOpen
        onClose={onClose}
        onSaveSession={onSaveSession}
        onLoadSession={onLoadSession}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Save file name" }), {
      target: { value: "Vanilla Oath Progress" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Session" }));
    expect(onSaveSession).toHaveBeenCalledWith("Vanilla Oath Progress");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Ollama")).toBeNull();
    expect(screen.queryByText("Debug Menu")).toBeNull();

    cleanup();
    render(
      <SaveLoadModal
        isOpen
        onClose={vi.fn()}
        onSaveSession={vi.fn()}
        onLoadSession={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Save file name" }),
    ).toHaveProperty("value", "Vanilla Oath Progress");
  });
});
