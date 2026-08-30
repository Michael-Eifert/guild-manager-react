import type { ChangeEvent } from "react";

import { DEFAULT_GUILD_SETUP, GUILD_FACTION } from "../constants";
import { getMissionListForContent } from "../missions/missionCatalog";
import { normalizeGuildProgress, getGuildDerivedStats } from "../guildProgression";
import { normalizeGuildSetup } from "../guild/guildSetup";
import { clampGameSpeed, DEFAULT_GAME_SPEED, normalizeProgressionState } from "../progression";
import { getDungeonBossCount } from "../missions/missionHelpers";
import { applyLoadedSessionToApp } from "../session/applyLoadedSession";
import type {
  SessionRefs,
  SessionSetters,
} from "../session/applyLoadedSession";
import type { Mission } from "../types/missionTypes";
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
  setActiveBrowserSaveSlot,
  writeBrowserSession,
} from "../session/browserSessionPersistence";
import { writePreferredSessionFilename } from "../session/sessionExportFilename";
import type { BrowserSaveSlotId } from "../session/browserSessionPersistence";
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
  itemCatalog = null,
}: {
  state: SessionState;
  refs: SessionRefs;
  setters: SessionSetters;
  closeOverlays: () => void;
  normalizeRosterZones: (
    roster: SessionCharacter[],
    faction?: string,
    contentPhase?: string,
  ) => SessionCharacter[];
  createId: () => string;
  pushNotification: (notification: NotificationInput) => unknown;
  itemCatalog?: {
    byId?: (id: unknown) => Record<string, unknown> | null;
  } | null;
}) => {
  const hydrateOptions = {
    initialMissions: getMissionListForContent(),
    normalizeGuildProgress,
    normalizeGuildSetup,
    getGuildDerivedStats,
    normalizeProgressionState,
    defaultGameSpeed: DEFAULT_GAME_SPEED,
    createId,
    resolveDungeonBossCount: getDungeonBossCount,
    defaultGuildSetup: DEFAULT_GUILD_SETUP,
    itemCatalog,
  };

  const applySession = (
    loadedSession: ReturnType<typeof hydrateSessionData>,
  ) => {
    applyLoadedSessionToApp({
      loadedSession,
      factionFallback: GUILD_FACTION.ALLIANCE,
      normalizeRosterZones,
      getMissionListWithZones: (missions, contentPhase) =>
        getMissionListForContent(missions as Mission[], contentPhase),
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

  const restoreBrowserSession = (slotId?: BrowserSaveSlotId) => {
    const rawSession = readBrowserSession(slotId);
    if (!rawSession) return false;

    const payloadData = parseSessionPayload(rawSession);
    const loadedSession = hydrateSessionData({
      payloadData,
      ...hydrateOptions,
    });
    applySession(loadedSession);
    if (slotId) setActiveBrowserSaveSlot(slotId);
    return true;
  };

  const saveSession = (preferredFilename = "") => {
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
      downloadSessionPayload(payload, preferredFilename);
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
      onLoaded: (loadedSession, rawSession, sourceFile) => {
        applySession(loadedSession);
        writePreferredSessionFilename(sourceFile.name);
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
