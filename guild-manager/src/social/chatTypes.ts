import type { Character } from "../types/characterTypes";
import type { Mission } from "../types/missionTypes";

export type ChatChannel = "guild" | "general";
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
  | "guild-election";

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
}

export interface ReadyLfgGroup {
  searchId: string;
  mission: Mission;
  participants: PartyParticipant[];
  guildMemberIds: string[];
}
