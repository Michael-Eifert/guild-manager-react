import {
  CONFIG,
  DB_CLASSES,
  DB_RACES,
  DB_NAMES,
  DB_LASTNAMES,
  PROF_PAIRS,
} from "./constants";

export const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const getQualityColor = (q) =>
  q === 3
    ? "var(--q-rare)"
    : q === 2
      ? "var(--q-uncommon)"
      : q === 1
        ? "var(--q-common)"
        : "var(--q-poor)";
export const getQualityClass = (q) =>
  q === 3
    ? "text-blue-400"
    : q === 2
      ? "text-green-400"
      : q === 1
        ? "text-white"
        : "text-gray-400";
export const getReqExp = (l) => {
  if (l >= CONFIG.LEVEL_CAP) return 999999;
  if (typeof CONFIG.XP_TABLE[l] === "number") return CONFIG.XP_TABLE[l];
  // Fallback keeps progression working when LEVEL_CAP is raised before table expansion.
  return 20800 + Math.max(0, l - 20) * 1500;
};
export const getRaceIcon = (r) =>
  r === "Human" ? "🛡️" : r === "Dwarf" ? "🍺" : r === "Night Elf" ? "🌙" : "⚙️";
export const getRoleIcon = (r) =>
  r === "Tank" ? "🛡️" : r === "Healer" ? "➕" : "⚔️";

export const getSkillCap = (level) => {
  if (level >= 30) return 300;
  if (level >= 20) return 225;
  if (level >= 10) return 150;
  return 75;
};

export const getAutoSkillTarget = (level) => {
  if (level >= 20) return 225;
  if (level >= 15) return 150;
  if (level >= 10) return 100;
  if (level >= 5) return 50;
  return 0;
};

export const getNextTierLevel = (level) => {
  if (level < 10) return 10;
  if (level < 20) return 20;
  if (level < 30) return 30;
  return "Max";
};

export const getStarterGear = (charClass) => {
  const profs = DB_CLASSES[charClass].proficiencies;
  const armor = profs[0];
  const gear = {
    head: null,
    chest: null,
    legs: null,
    feet: null,
    hands: null,
    mainHand: null,
  };
  gear.feet = { name: "Worn Boots", quality: 0, type: armor };
  gear.mainHand = { name: "Dull Blade", quality: 0, type: "Generic" };
  if (armor === "Cloth") {
    gear.chest = { name: "Apprentice Robe", quality: 1, type: "Cloth" };
    gear.legs = { name: "Apprentice Pants", quality: 0, type: "Cloth" };
  } else if (armor === "Leather") {
    gear.chest = { name: "Thug's Vest", quality: 1, type: "Leather" };
    gear.legs = { name: "Thug's Pants", quality: 0, type: "Leather" };
  } else {
    gear.chest = { name: "Rusty Chain Vest", quality: 1, type: "Mail" };
    gear.legs = { name: "Rusty Chain Pants", quality: 0, type: "Mail" };
  }
  return gear;
};

export const generateCharacter = () => {
  const races = Object.keys(DB_RACES);
  const race = races[Math.floor(Math.random() * races.length)];
  const allowedClasses = DB_RACES[race];
  const charClass =
    allowedClasses[Math.floor(Math.random() * allowedClasses.length)];
  const gender = Math.random() > 0.5 ? "Male" : "Female";
  const raceNames = DB_NAMES[race] || DB_NAMES["Human"];
  const namesList = raceNames[gender] || raceNames["Male"];
  const firstName = namesList[Math.floor(Math.random() * namesList.length)];
  const lastName =
    Math.random() > 0.4
      ? " " + DB_LASTNAMES[Math.floor(Math.random() * DB_LASTNAMES.length)]
      : "";
  const allowedRoles = DB_CLASSES[charClass].allowedRoles;
  const role = allowedRoles[Math.floor(Math.random() * allowedRoles.length)];

  const starterProfs = PROF_PAIRS[charClass] || ["Mining", "Herbalism"];
  const professions = starterProfs.map((p) => ({ name: p, skill: 1 }));

  return {
    id: createId(),
    name: firstName + lastName,
    race,
    gender,
    charClass,
    role,
    level: 1,
    exp: 0,
    maxExp: CONFIG.XP_TABLE[1],
    status: "Idle",
    statusText: "Waiting for orders...",
    activityMode: "Auto",
    professions: professions,
    history: [],
    equipment: getStarterGear(charClass),
    lastLevelUp: 0,
    backstory: null,
  };
};
