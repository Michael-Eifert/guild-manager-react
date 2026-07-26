import type { Character } from "../types/characterTypes";
import type { Mission } from "../types/missionTypes";

export type ChatChannel = "guild" | "general" | "tavern";
export type ChatContentKind = "system" | "roleplay";
export type ChatIntent =
  | "lfg-request"
  | "join"
  | "role-needed"
  | "general-search"
  | "group-ready"
  | "group-start"
  | "search-expired"
  | "mission-success"
  | "mission-failed"
  | "guild-election"
  | "rp-run-success"
  | "rp-run-failure"
  | "rp-blame"
  | "rp-defense"
  | "rp-praise"
  | "rp-dispute"
  | "rp-morale"
  | "rp-reconciliation"
  | "rp-world-rumor"
  | "rp-leadership";

export type ParticipantSource = "guild" | "realm";

export interface PartyParticipant {
  id: string;
  source: ParticipantSource;
  name: string;
  faction?: string;
  race?: string;
  gender?: string;
  charClass?: string;
  role?: string;
  level: number;
  itemLevel?: number;
  guildName?: string | null;
  personalityTraits?: Character["personalityTraits"];
}

export interface ChatMessage {
  id: string;
  sequence: number;
  channel: ChatChannel;
  intent: ChatIntent;
  text: string;
  fallbackText: string;
  textSource: "template" | "openai-compatible" | "ollama";
  generationStatus: "ready" | "pending";
  gameTimeMs: number;
  speaker: PartyParticipant | null;
  searchId?: string;
  contentKind?: ChatContentKind;
  sceneId?: string;
  replyToMessageId?: string;
  incidentId?: string;
  sceneTag?: string;
  rpContext?: {
    missionName?: string;
    bossName?: string;
    otherSpeakerName?: string;
    relationshipPoints?: number;
    relationshipLabel?: string;
    subjectiveClaim?: string;
    choiceLabel?: string;
  };
}

export type RpSceneStatus =
  | "queued"
  | "active"
  | "awaiting-choice"
  | "completed";

export type RpSceneKind =
  | "run-success"
  | "run-failure"
  | "guild-incident"
  | "realm-news";

export interface RpSceneTurn {
  speakerId: string;
  intent: ChatIntent;
  subjectiveClaim?: string;
  choiceLabel?: string;
}

export interface RpScene {
  id: string;
  sourceEventId: string;
  kind: RpSceneKind;
  tag: string;
  priority: number;
  status: RpSceneStatus;
  createdAt: number;
  nextTurnAt: number;
  completedAt?: number;
  participants: PartyParticipant[];
  turns: RpSceneTurn[];
  nextTurnIndex: number;
  missionName?: string;
  bossName?: string;
  incidentId?: string;
  relationshipPoints?: number;
  interactive?: boolean;
}

export interface RpDailyCounters {
  dayIndex: number;
  nonInteractiveScenes: number;
}

export type LfgSearchPhase =
  | "guild"
  | "general"
  | "ready"
  | "in-progress"
  | "completed"
  | "expired";

export interface LfgSearch {
  id: string;
  missionId: Mission["id"];
  missionName: string;
  missionType: "dungeon" | "elite";
  targetSize: number;
  phase: LfgSearchPhase;
  createdAt: number;
  guildSearchEndsAt: number;
  expiresAt: number;
  nextResponseAt: number;
  participantIds: string[];
  participants: PartyParticipant[];
  initiatorId: string;
  missionInstanceId?: string;
}

export interface SocialState {
  messages: ChatMessage[];
  searches: LfgSearch[];
  reservedRealmPlayerIds: string[];
  nextSequence: number;
  lastSearchCheckpoint: number;
  lastReadSequenceByChannel: Record<ChatChannel, number>;
  rpScenes: RpScene[];
  processedRpEventIds: string[];
  rpDailyCounters: RpDailyCounters;
}

export interface ReadyLfgGroup {
  searchId: string;
  mission: Mission;
  participants: PartyParticipant[];
  guildMemberIds: string[];
}
