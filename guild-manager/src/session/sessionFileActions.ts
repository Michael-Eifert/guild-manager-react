import type { ChangeEvent, RefObject } from "react";
import type { MissionInput } from "../types/missionTypes";
import type { SocialState } from "../social/chatTypes";
import type { GuildRelationsState } from "../guildRelations/guildRelations";
import type { GuildActivityStats } from "../guild/guildActivityStats";
import type { GameSettingsState } from "../settings/gameSettings";

import {
  buildSessionPayload,
  downloadSessionPayload,
  hydrateSessionData,
  parseSessionPayload,
} from "./sessionPersistence";

export type SessionState = {
  roster: unknown[];
  activeMissions: unknown[];
  missionList: unknown[];
  guildLog: unknown[];
  guildGold: number;
  guildProgress: Record<string, unknown>;
  guildSetup: Record<string, unknown>;
  guildRelationships: Record<string, unknown>;
  realmState: Record<string, unknown> | null;
  worldPvpState: Record<string, unknown>;
  battlefieldState: Record<string, unknown>;
  guildInventory: Record<string, unknown>;
  stashPolicy: Record<string, unknown>;
  calendarState: Record<string, unknown>;
  raidLockouts: Record<string, unknown>;
  missionBoardState: Record<string, unknown>;
  socialState: SocialState;
  guildRelationsState: GuildRelationsState;
  guildActivityStats: GuildActivityStats;
  gameSettings: GameSettingsState;
  gameSpeed: number;
  isPaused: boolean;
  gameTimeMs: number;
};

type HydrateOptions = {
  initialMissions: unknown[];
  normalizeGuildProgress: (value: unknown) => unknown;
  normalizeGuildSetup: (
    value: unknown,
    payloadData?: Record<string, unknown>,
  ) => unknown;
  getGuildDerivedStats: (value: unknown) => { goldCap: number };
  normalizeProgressionState: (value: unknown) => {
    gameTimeMs: number;
    gameSpeed: number;
    isPaused: boolean;
  };
  defaultGameSpeed: number;
  defaultGuildSetup: unknown;
  createId: () => string;
  resolveDungeonBossCount: (mission: MissionInput) => number;
  itemCatalog?: {
    byId?: (id: unknown) => Record<string, unknown> | null;
  } | null;
};
type HydratedSession = ReturnType<typeof hydrateSessionData>;

export const saveSessionFile = (sessionState: SessionState) => {
  const payload = buildSessionPayload(sessionState);
  downloadSessionPayload(payload);
};

export const openSessionFilePicker = (
  sessionFileInputRef: RefObject<HTMLInputElement | null>,
) => {
  sessionFileInputRef?.current?.click();
};

export const loadSessionFile = ({
  event,
  hydrateOptions,
  onLoaded,
  onInvalidSession,
  onReadError,
}: {
  event: ChangeEvent<HTMLInputElement>;
  hydrateOptions: HydrateOptions;
  onLoaded?: (
    loadedSession: HydratedSession,
    rawSession: string,
    sourceFile: File,
  ) => void;
  onInvalidSession?: (error: unknown) => void;
  onReadError?: () => void;
}) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rawSession = String(reader.result || "");
      const payloadData = parseSessionPayload(rawSession);
      const loadedSession = hydrateSessionData({
        payloadData,
        ...hydrateOptions,
      });
      onLoaded?.(loadedSession, rawSession, file);
    } catch (error) {
      onInvalidSession?.(error);
    }
  };
  reader.onerror = () => {
    onReadError?.();
  };
  reader.readAsText(file);
};
