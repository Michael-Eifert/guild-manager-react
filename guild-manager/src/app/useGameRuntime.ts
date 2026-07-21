import type { MutableRefObject } from "react";

import { advanceGameTime } from "../progression";
import type { GameServices } from "./gameTypes";
import type { StateCommit } from "./useSynchronizedState";
import { useRuntimeInterval } from "./useRuntimeInterval";

type ActiveTick = {
  now: number;
  elapsedGameMs: number;
};

export const useGameRuntime = ({
  isPaused,
  gameSpeed,
  services,
  gameTimeRef,
  lastRealTimeRef,
  setGameTimeMs,
  intervalMs,
  onActiveTick,
}: {
  isPaused: boolean;
  gameSpeed: number;
  services: GameServices;
  gameTimeRef: MutableRefObject<number>;
  lastRealTimeRef: MutableRefObject<number>;
  setGameTimeMs: StateCommit<number>;
  intervalMs: number;
  onActiveTick: (tick: ActiveTick) => void;
}) => {
  useRuntimeInterval(() => {
    const previousGameTime = gameTimeRef.current;
    const clockStep = advanceGameTime({
      currentGameTime: previousGameTime,
      lastRealTime: lastRealTimeRef.current,
      realNow: services.now(),
      isPaused,
      speed: gameSpeed,
    });
    gameTimeRef.current = clockStep.gameTime;
    lastRealTimeRef.current = clockStep.lastRealTime;
    setGameTimeMs(clockStep.gameTime);
    if (isPaused) return;

    onActiveTick({
      now: clockStep.gameTime,
      elapsedGameMs: Math.max(0, clockStep.gameTime - previousGameTime),
    });
  }, intervalMs);
};
