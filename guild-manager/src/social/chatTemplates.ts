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
  bossName?: string;
  otherSpeakerName?: string;
  relationshipPoints?: number;
  subjectiveClaim?: string;
  choiceLabel?: string;
};

const TEMPLATES: Record<ChatIntent, string[]> = {
  "lfg-request": [
    "Anyone up for {mission}? We are {size}/{target}.",
    "Putting a group together for {mission}. Need {remaining} more.",
    "LFG {mission} — currently {size}/{target}.",
  ],
  join: ["I can help with {mission}.", "Count me in for {mission}.", "I am available. Invite me!"],
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
    "Yes! We did it. {mission} is complete!",
    "{mission} cleared. That was a great run!",
    "We actually pulled it off! {mission} is done.",
    "Nice work everyone. We conquered {mission}!",
    "That is how it is done. {mission} did not stand a chance.",
    "Victory! We are coming home from {mission}.",
    "{mission} complete. I knew this group could do it!",
    "What a finish! {mission} is finally behind us.",
  ],
  "mission-failed": [
    "Damn, we did not get them. {mission} beat us this time.",
    "That was rough. We could not finish {mission}.",
    "We gave {mission} everything, but it was not enough.",
    "Back from {mission} empty-handed. That one hurts.",
    "{mission} went badly. I really thought we had it.",
  ],
  "guild-election": ["{speaker} has been elected as the new Guild Master."],
  "rp-run-success": [
    "That was a clean victory in {mission}. {boss} never stood a chance.",
    "I am still smiling about {mission}. We earned that clear.",
    "Great work in {mission}. Everyone kept their nerve at {boss}.",
    "That run through {mission} is one for the guild ledger.",
    "We finally brought down {boss}. Drinks are on me tonight.",
    "{mission} is cleared. I would run with this group again.",
  ],
  "rp-run-failure": [
    "We did not get past {boss} in {mission}. That one still hurts.",
    "{boss} stopped us cold. We need a better plan for {mission}.",
    "That attempt in {mission} fell apart, but we learned something.",
    "We came home from {mission} without the clear. Next time will be different.",
    "I keep replaying that fight with {boss}. We were so close.",
    "{mission} beat us today. It will not beat us forever.",
  ],
  "rp-blame": [
    "{other}, {claim}",
    "We need to talk about {boss}. {other}, {claim}",
    "I hate saying it, but {other}, {claim}",
    "That wipe was avoidable. {other}, {claim}",
    "Something went wrong at {boss}. {other}, {claim}",
    "I am frustrated after {mission}. {other}, {claim}",
  ],
  "rp-defense": [
    "That is not fair. We all made mistakes at {boss}.",
    "Do not put the whole wipe on me. The plan broke down for everyone.",
    "I followed the call. Let us review what actually happened.",
    "Blaming one person will not get us through {mission}.",
    "I will own my mistakes, but that fight was a group failure.",
    "Let us cool down and look at the run properly.",
  ],
  "rp-praise": [
    "{other} was brilliant at {boss}. That clear does not happen without them.",
    "Credit where it is due: {other} carried the hard moments in {mission}.",
    "I want everyone to know how well {other} played that run.",
    "{other} kept us together when {mission} got messy.",
    "That victory belongs to the whole group, but {other} really stood out.",
    "I would trust {other} beside me in any dungeon.",
  ],
  "rp-dispute": [
    "{other}, we cannot keep handling problems like this.",
    "The tension between us is hurting the guild, {other}.",
    "We need to settle this before it spills into another group.",
    "I am tired of pretending everything is fine between us.",
    "This argument has gone on long enough.",
    "We disagree, but the guild should not pay for it.",
  ],
  "rp-morale": [
    "I have not felt like myself lately. Can we talk, {other}?",
    "That last run shook my confidence more than I expected.",
    "I could use some support before the next mission.",
    "I am worried I am letting the guild down.",
    "It has been a rough stretch. I do not want to face it alone.",
    "I need a moment to get my head straight.",
  ],
  "rp-reconciliation": [
    "{other}, I do not want this grudge to define us.",
    "We have both said enough. I would rather rebuild some trust.",
    "The guild needs us working together. Can we start again?",
    "I was too harsh before. I want to make this right.",
    "We do not have to be friends, but we can respect each other.",
    "Let us leave the old argument behind us.",
  ],
  "rp-world-rumor": [
    "Word from the road: {claim}",
    "Have you heard? {claim}",
    "The whole realm is talking about it: {claim}",
    "A traveler just brought news — {claim}",
    "Rumor has it that {claim}",
    "The tavern is buzzing tonight. {claim}",
  ],
  "rp-leadership": [
    "Leadership has decided to {choice}. Let us move forward together.",
    "The guild's answer is clear: {choice}.",
    "We will handle this by choosing to {choice}.",
    "Enough uncertainty. We are going to {choice}.",
    "For the good of the guild, the decision is to {choice}.",
    "I have heard both sides. We will {choice}.",
  ],
};

const PERSONALITY_TEMPLATES: Record<string, Partial<Record<ChatIntent, string[]>>> = {
  dungeon_expert: {
    "lfg-request": ["I know a clean route through {mission}. We are {size}/{target}."],
    join: ["I know {mission}. Invite me and I will guide the route."],
    "group-start": ["Stay close. I know the quickest path through {mission}."],
    "mission-success": ["Clean run through {mission}. Just like I planned."],
    "rp-run-failure": ["We lost control at {boss}. The route through {mission} needs adjusting."],
  },
  power_leveler: {
    "lfg-request": ["Quick {mission} run? Need {remaining} more."],
    join: ["Invite me for a fast {mission} run."],
    "group-ready": ["Full group. Let us clear {mission} quickly!"],
    "mission-success": ["Fast and clean! {mission} is done. Next one?"],
    "mission-failed": ["So much time lost in {mission}. We have to do better."],
    "rp-blame": ["{other}, {claim} We cannot keep losing time like this."],
  },
  raider: {
    "role-needed": ["{mission} still needs a solid {role}. Any volunteers?"],
    join: ["I am ready and prepared for {mission}."],
    "group-start": ["Check your gear. Moving into {mission} now."],
    "mission-success": ["Excellent execution in {mission}. Everyone did their job."],
    "mission-failed": ["That attempt at {mission} was not clean enough. We need to regroup."],
    "rp-run-success": ["Excellent execution at {boss}. That is how {mission} should look."],
  },
  casual_gamer: {
    "lfg-request": ["Anyone fancy a relaxed {mission} run? {size}/{target}."],
    join: ["Sure, I can tag along for {mission}."],
    "mission-success": ["That was fun! Great job with {mission}, everyone."],
    "mission-failed": ["No worries about {mission}. We can try again later."],
    "rp-run-failure": ["Rough run, but it is only a game. We can try {mission} again."],
    "rp-reconciliation": ["No hard feelings, {other}. Let us enjoy the next run."],
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
  bossName = "the final foe",
  otherSpeakerName = "friend",
  relationshipPoints = 0,
  subjectiveClaim = "we needed better coordination.",
  choiceLabel = "resolve this constructively",
}: TemplateContext) => {
  const traitIds = (Array.isArray(speaker?.personalityTraits) ? speaker.personalityTraits : [])
    .map((trait) =>
      typeof trait === "string" ? trait : String((trait as { id?: unknown })?.id || ""),
    )
    .filter(Boolean);
  const personalityTemplates = traitIds
    .map((traitId) => PERSONALITY_TEMPLATES[traitId]?.[intent])
    .find((templates): templates is string[] => Boolean(templates?.length));
  const templates = personalityTemplates || TEMPLATES[intent];
  const seed = `${channel}:${intent}:${speaker?.id || "system"}:${traitIds.join(",")}:${missionName}:${currentSize}:${otherSpeakerName}`;
  const template = templates[hashText(seed) % templates.length];
  return template
    .replaceAll("{mission}", missionName)
    .replaceAll("{size}", String(currentSize))
    .replaceAll("{target}", String(targetSize))
    .replaceAll("{remaining}", String(Math.max(0, targetSize - currentSize)))
    .replaceAll("{role}", neededRole || "adventurer")
    .replaceAll("{boss}", bossName)
    .replaceAll("{other}", otherSpeakerName)
    .replaceAll("{relationship}", String(relationshipPoints))
    .replaceAll("{claim}", subjectiveClaim)
    .replaceAll("{choice}", choiceLabel.toLowerCase())
    .replaceAll("{speaker}", speaker?.name || "A guild member");
};

export const getDeterministicResponseDelayMs = (seed: string) =>
  3_000 + (hashText(seed) % 5_001);
