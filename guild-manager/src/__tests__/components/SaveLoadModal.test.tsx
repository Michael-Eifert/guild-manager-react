// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SaveLoadModal from "../../components/modals/SaveLoadModal";

afterEach(cleanup);

describe("SaveLoadModal", () => {
  it("contains only the session save and load actions", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Save Session" }));
    expect(onSaveSession).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Ollama")).toBeNull();
    expect(screen.queryByText("Debug Menu")).toBeNull();
  });
});
