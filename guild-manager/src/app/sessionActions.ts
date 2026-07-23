import { DEFAULT_GUILD_SETUP, GUILD_FACTION, INITIAL_MISSIONS } from "../constants";
import { getMissionListWithZones } from "../zones/zoneLogic";
import { normalizeGuildProgress, getGuildDerivedStats } from "../guildProgression";
import { normalizeGuildSetup } from "../guild/guildSetup";
import { clampGameSpeed, DEFAULT_GAME_SPEED, normalizeProgressionState } from "../progression";
import { getDungeonBossCount } from "../missions/missionHelpers";
import { applyLoadedSessionToApp } from "../session/applyLoadedSession";
import {
  loadSessionFile,
  openSessionFilePicker,
  saveSessionFile,
} from "../session/sessionFileActions";
import type { SessionState } from "../session/sessionFileActions";
import type { NotificationInput } from "./gameTypes";

type AnyRecord = Record<string, any>;

export const createSessionActions = ({
  state,
  refs,
  setters,
  closeOverlays,
  normalizeRosterZones,
  createId,
  pushNotification,
}: {
  state: SessionState;
  refs: AnyRecord;
  setters: AnyRecord;
  closeOverlays: () => void;
  normalizeRosterZones: (roster: AnyRecord[], faction?: string) => AnyRecord[];
  createId: () => string;
  pushNotification: (notification: NotificationInput) => unknown;
}) => {
  const saveSession = () => {
    try {
      saveSessionFile({ ...state, gameTimeMs: refs.gameTime.current });
    } catch (error) {
      console.error("Failed to save session:", error);
      pushNotification({ type: "error", title: "Save Failed", message: "Could not create the session file." });
    }
  };

  const openSession = () => openSessionFilePicker(refs.sessionFileInput);

  const loadSession = (event: ChangeEvent<HTMLInputElement>) => {
    loadSessionFile({
      event,
      hydrateOptions: {
        initialMissions: getMissionListWithZones(INITIAL_MISSIONS),
        normalizeGuildProgress,
        normalizeGuildSetup,
        getGuildDerivedStats,
        normalizeProgressionState,
        defaultGameSpeed: DEFAULT_GAME_SPEED,
        createId,
        resolveDungeonBossCount: getDungeonBossCount,
        defaultGuildSetup: DEFAULT_GUILD_SETUP,
      },
      onLoaded: (loadedSession: AnyRecord) => {
        applyLoadedSessionToApp({
          loadedSession,
          factionFallback: GUILD_FACTION.ALLIANCE,
          normalizeRosterZones,
          getMissionListWithZones,
          clampGameSpeed,
          refs,
          setters,
          closeOverlays,
        });
        pushNotification({ type: "success", title: "Session Loaded", message: "The guild session was loaded successfully." });
      },
      onInvalidSession: (error: unknown) => {
        console.error("Failed to load session:", error);
        pushNotification({
          type: "error",
          title: "Invalid Session",
          message:
            (error instanceof Error ? error.message : "") ||
            "The selected session file is invalid.",
          durationMs: 6500,
        });
      },
      onReadError: () => pushNotification({
        type: "error",
        title: "Read Failed",
        message: "Could not read the selected session file.",
      }),
    });
  };

  return { saveSession, openSession, loadSession };
};
import type { ChangeEvent } from "react";
