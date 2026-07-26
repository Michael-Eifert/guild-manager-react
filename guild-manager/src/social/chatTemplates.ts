import type {
  ChatChannel,
  ChatIntent,
  PartyParticipant,
} from "./chatTypes";

type TemplateContext = {
  channel: ChatChannel;
  intent: ChatIntent;
  speaker: PartyParticipant | null;
  missionName?: string;
  currentSize?: number;
  targetSize?: number;
  neededRole?: string | null;
};

const TEMPLATES: Record<ChatIntent, string[]> = {
  "lfg-request": [
    "Anyone up for {mission}? We are {size}/{target}.",
    "Putting a group together for {mission}. Need {remaining} more.",
    "LFG {mission} — currently {size}/{target}.",
  ],
  join: [
    "I can help with {mission}.",
    "Count me in for {mission}.",
    "I am available. Invite me!",
  ],
  "role-needed": [
    "Still looking for a {role} for {mission}.",
    "We need one more {role}, then {mission} is ready.",
    "{mission}: any {role} available?",
  ],
  "general-search": [
    "LFG {mission}, {size}/{target}. Same-faction adventurers welcome.",
    "Looking for more for {mission}. We still need {remaining}.",
    "{mission} group forming now — {size}/{target}.",
  ],
  "group-ready": [
    "Group is full. Heading to {mission}!",
    "{mission} is ready. Let us move!",
    "That makes {target}/{target}. Starting {mission}.",
  ],
  "group-start": [
    "Entering {mission}. Good luck everyone!",
    "On our way to {mission}.",
    "{mission} starts now. Stay sharp!",
  ],
  "search-expired": [
    "Could not fill {mission}. We will try again later.",
    "Calling off the {mission} search for now.",
    "Not enough people for {mission}. Another time.",
  ],
  "mission-success": [
    "{mission} cleared. Great run!",
    "Nice work in {mission}. Everyone made it back.",
    "{mission} is done. Thanks for the group!",
  ],
  "mission-failed": [
    "{mission} did not go our way. We will regroup.",
    "Rough run in {mission}. Better luck next time.",
    "We are back from {mission}. That one hurt.",
  ],
};

const PERSONALITY_TEMPLATES: Record<
  string,
  Partial<Record<ChatIntent, string[]>>
> = {
  dungeon_expert: {
    "lfg-request": [
      "I know a clean route through {mission}. We are {size}/{target}.",
    ],
    join: ["I know {mission}. Invite me and I will guide the route."],
    "group-start": ["Stay close. I know the quickest path through {mission}."],
  },
  power_leveler: {
    "lfg-request": ["Quick {mission} run? Need {remaining} more."],
    join: ["Invite me for a fast {mission} run."],
    "group-ready": ["Full group. Let us clear {mission} quickly!"],
  },
  raider: {
    "role-needed": ["{mission} still needs a solid {role}. Any volunteers?"],
    join: ["I am ready and prepared for {mission}."],
    "group-start": ["Check your gear. Moving into {mission} now."],
  },
  casual_gamer: {
    "lfg-request": ["Anyone fancy a relaxed {mission} run? {size}/{target}."],
    join: ["Sure, I can tag along for {mission}."],
    "mission-failed": ["No worries about {mission}. We can try again later."],
  },
};

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const renderChatTemplate = ({
  channel,
  intent,
  speaker,
  missionName = "the mission",
  currentSize = 1,
  targetSize = 5,
  neededRole = null,
}: TemplateContext) => {
  const traitIds = (Array.isArray(speaker?.personalityTraits)
    ? speaker.personalityTraits
    : []
  )
    .map((trait) =>
      typeof trait === "string"
        ? trait
        : String((trait as { id?: unknown })?.id || ""),
    )
    .filter(Boolean);
  const personalityTemplates = traitIds
    .map((traitId) => PERSONALITY_TEMPLATES[traitId]?.[intent])
    .find((templates): templates is string[] => Boolean(templates?.length));
  const templates = personalityTemplates || TEMPLATES[intent];
  const seed = `${channel}:${intent}:${speaker?.id || "system"}:${traitIds.join(",")}:${missionName}:${currentSize}`;
  const template = templates[hashText(seed) % templates.length];
  return template
    .replaceAll("{mission}", missionName)
    .replaceAll("{size}", String(currentSize))
    .replaceAll("{target}", String(targetSize))
    .replaceAll("{remaining}", String(Math.max(0, targetSize - currentSize)))
    .replaceAll("{role}", neededRole || "adventurer");
};

export const getDeterministicResponseDelayMs = (seed: string) =>
  3_000 + (hashText(seed) % 5_001);
