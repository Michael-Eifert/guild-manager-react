import type { GameCommand, GameEvent, GameState, TransitionResult } from "./gameTypes";

export type GameReducer = (state: GameState, command: GameCommand) => TransitionResult;
export type GameStore = ReturnType<typeof createGameStore>;

export const advanceGameState = (state: GameState, realNow: number): TransitionResult => {
  const safeRealNow = Number.isFinite(realNow) ? realNow : state.clock.lastRealTimeMs || 0;
  const lastRealTimeMs = state.clock.lastRealTimeMs ?? safeRealNow;
  const elapsedRealMs = Math.max(0, safeRealNow - lastRealTimeMs);
  const elapsedGameMs = state.clock.isPaused
    ? 0
    : elapsedRealMs * Math.max(0, state.clock.gameSpeed || 0);
  const clock = {
    ...state.clock,
    gameTimeMs: state.clock.gameTimeMs + elapsedGameMs,
    lastRealTimeMs: safeRealNow,
  };
  if (
    clock.gameTimeMs === state.clock.gameTimeMs &&
    clock.lastRealTimeMs === state.clock.lastRealTimeMs
  ) {
    return { state, events: [] };
  }
  return { state: { ...state, clock }, events: [] };
};

export const reduceGameCommand: GameReducer = (state, command) => {
  if (command.type === "clock/tick") {
    return advanceGameState(state, command.realNow);
  }
  if (command.type === "session/replace") {
    return { state: command.state, events: [] };
  }
  if (command.type === "roster/update") {
    const roster = state.roster.map((character) =>
      character.id === command.characterId
        ? { ...character, ...command.changes }
        : character,
    );
    return roster.every((character, index) => character === state.roster[index])
      ? { state, events: [] }
      : { state: { ...state, roster }, events: [] };
  }
  return { state, events: [] };
};

export const createGameStore = (
  initialState: GameState,
  reducer: GameReducer = reduceGameCommand,
) => {
  let state = initialState;
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(events: GameEvent[]) => void>();

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeEvents(listener: (events: GameEvent[]) => void) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    dispatch(command: GameCommand) {
      const transition = reducer(state, command);
      if (transition.state !== state) {
        state = transition.state;
        listeners.forEach((listener) => listener());
      }
      if (transition.events.length > 0) {
        eventListeners.forEach((listener) => listener(transition.events));
      }
      return transition;
    },
  };
};
