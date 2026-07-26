import type { ChangeEvent } from "react";

import { DEFAULT_GUILD_SETUP, GUILD_FACTION, INITIAL_MISSIONS } from "../constants";
import { getMissionListWithZones } from "../zones/zoneLogic";
import { normalizeGuildProgress, getGuildDerivedStats } from "../guildProgression";
import { normalizeGuildSetup } from "../guild/guildSetup";
import { clampGameSpeed, DEFAULT_GAME_SPEED, normalizeProgressionState } from "../progression";
import { getDungeonBossCount } from "../missions/missionHelpers";
import { applyLoadedSessionToApp } from "../session/applyLoadedSession";
import type {
  SessionRefs,
  SessionSetters,
} from "../session/applyLoadedSession";
import {
  loadSessionFile,
  openSessionFilePicker,
} from "../session/sessionFileActions";
import type { SessionState } from "../session/sessionFileActions";
import {
  buildSessionPayload,
  downloadSessionPayload,
  hydrateSessionData,
  parseSessionPayload,
} from "../session/sessionPersistence";
import {
  readBrowserSession,
  writeBrowserSession,
} from "../session/browserSessionPersistence";
import type { NotificationInput } from "./gameTypes";

type SessionCharacter = Record<string, unknown>;

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
  refs: SessionRefs;
  setters: SessionSetters;
  closeOverlays: () => void;
  normalizeRosterZones: (
    roster: SessionCharacter[],
    faction?: string,
  ) => SessionCharacter[];
  createId: () => string;
  pushNotification: (notification: NotificationInput) => unknown;
}) => {
  const hydrateOptions = {
    initialMissions: getMissionListWithZones(INITIAL_MISSIONS),
    normalizeGuildProgress,
    normalizeGuildSetup,
    getGuildDerivedStats,
    normalizeProgressionState,
    defaultGameSpeed: DEFAULT_GAME_SPEED,
    createId,
    resolveDungeonBossCount: getDungeonBossCount,
    defaultGuildSetup: DEFAULT_GUILD_SETUP,
  };

  const applySession = (
    loadedSession: ReturnType<typeof hydrateSessionData>,
  ) => {
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
  };

  const buildCurrentSessionPayload = () =>
    buildSessionPayload({
      ...state,
      gameTimeMs: refs.gameTime.current,
    });

  const persistBrowserSession = () => {
    const saved = writeBrowserSession(buildCurrentSessionPayload());
    if (!saved && typeof window !== "undefined") {
      throw new Error("Browser storage is unavailable.");
    }
    return saved;
  };

  const restoreBrowserSession = () => {
    const rawSession = readBrowserSession();
    if (!rawSession) return false;

    const payloadData = parseSessionPayload(rawSession);
    const loadedSession = hydrateSessionData({
      payloadData,
      ...hydrateOptions,
    });
    applySession(loadedSession);
    return true;
  };

  const saveSession = () => {
    const payload = buildCurrentSessionPayload();
    try {
      if (!writeBrowserSession(payload)) {
        throw new Error("Browser storage is unavailable.");
      }
    } catch (error) {
      console.error("Failed to update browser autosave:", error);
      pushNotification({
        type: "warning",
        title: "Browser Autosave Failed",
        message: "The browser copy could not be updated.",
      });
    }

    try {
      downloadSessionPayload(payload);
    } catch (error) {
      console.error("Failed to save session:", error);
      pushNotification({
        type: "error",
        title: "Save Failed",
        message: "Could not create the session file.",
      });
    }
  };

  const openSession = () => openSessionFilePicker(refs.sessionFileInput);

  const loadSession = (event: ChangeEvent<HTMLInputElement>) => {
    loadSessionFile({
      event,
      hydrateOptions,
      onLoaded: (loadedSession, rawSession) => {
        applySession(loadedSession);
        try {
          if (!writeBrowserSession(rawSession, true)) {
            throw new Error("Browser storage is unavailable.");
          }
        } catch (error) {
          console.error("Failed to update browser autosave:", error);
          pushNotification({
            type: "warning",
            title: "Browser Autosave Failed",
            message: "The browser copy could not be updated.",
          });
        }
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

  return {
    saveSession,
    openSession,
    loadSession,
    persistBrowserSession,
    restoreBrowserSession,
  };
};
