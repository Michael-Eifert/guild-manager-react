import { useEffect, useLayoutEffect, useRef } from "react";

/** Runs a stable interval while always invoking the latest callback. */
export const useRuntimeInterval = (callback: () => void, intervalMs: number) => {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const timerId = window.setInterval(() => callbackRef.current(), intervalMs);
    return () => window.clearInterval(timerId);
  }, [intervalMs]);
};
