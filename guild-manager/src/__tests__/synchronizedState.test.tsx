// @vitest-environment jsdom
import React, { useEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useSynchronizedState } from "../app/useSynchronizedState";

afterEach(cleanup);

describe("useSynchronizedState", () => {
  it("updates the runtime ref before publishing the React render", () => {
    const handles = { current: null };
    const Probe = ({ onReady }) => {
      const [value, setValue, ref] = useSynchronizedState({ roster: ["hero"] });
      useEffect(() => onReady({ commit: setValue, stateRef: ref }), [onReady, ref, setValue]);
      return <div data-testid="roster">{value.roster.join(",")}</div>;
    };
    render(<Probe onReady={(value) => { handles.current = value; }} />);

    act(() => {
      const next = handles.current.commit((current) => ({ ...current, roster: [] }));
      expect(next.roster).toEqual([]);
      expect(handles.current.stateRef.current.roster).toEqual([]);
    });
    expect(screen.getByTestId("roster").textContent).toBe("");
  });
});
