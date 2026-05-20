import { REALM_NEWS_LIMIT } from "./realmDefinitions";

export const createRealmNewsItem = ({
  id,
  dayIndex = 0,
  type = "realm",
  message,
}) => ({
  id,
  dayIndex: Math.max(0, Math.floor(Number(dayIndex) || 0)),
  type,
  message: String(message || "").trim(),
});

const getRealmNewsExactKey = (entry) =>
  [
    String(entry?.id || "").trim(),
    Math.max(0, Math.floor(Number(entry?.dayIndex) || 0)),
    String(entry?.type || "realm"),
    String(entry?.message || "").trim(),
  ].join("|");

export const getRealmNewsRenderKey = (entry, index = 0) => {
  const id = String(entry?.id || "").trim();
  if (id) return `${id}:${index}`;
  return `realm-news:${Math.max(0, Math.floor(Number(entry?.dayIndex) || 0))}:${
    entry?.type || "realm"
  }:${index}`;
};

export const capRealmNews = (news) => {
  const exactEntries = new Set();
  const usedIds = new Map();
  const capped = [];

  for (const entry of Array.isArray(news) ? news : []) {
    const message = String(entry?.message || "").trim();
    if (!message) continue;

    const exactKey = getRealmNewsExactKey(entry);
    if (exactEntries.has(exactKey)) continue;
    exactEntries.add(exactKey);

    const rawId = String(entry?.id || "").trim();
    if (!rawId) {
      capped.push({ ...entry, message });
    } else {
      const idUseCount = usedIds.get(rawId) || 0;
      usedIds.set(rawId, idUseCount + 1);
      capped.push(
        idUseCount === 0
          ? { ...entry, message }
          : { ...entry, id: `${rawId}:${idUseCount}`, message },
      );
    }

    if (capped.length >= REALM_NEWS_LIMIT) break;
  }

  return capped;
};

export const buildRealmNewsForDay = ({
  random,
  dayIndex,
  npcGuilds,
  rankings = [],
  playerGuildSnapshot,
  realmEvents = [],
}) => {
  const news = [];
  const safeRandom = typeof random === "function" ? random : Math.random;
  const guilds = Array.isArray(npcGuilds) ? npcGuilds : [];
  const pickGuild = () =>
    guilds[Math.floor(safeRandom() * guilds.length)] || guilds[0];
  const addNews = (type, message) => {
    if (!message) return;
    news.push(
      createRealmNewsItem({
        id: `realm-news:${dayIndex}:${type}:${news.length}`,
        dayIndex,
        type,
        message,
      }),
    );
  };

  if (guilds.length === 0) return news;

  const raidEvents = (Array.isArray(realmEvents) ? realmEvents : []).filter(
    (event) => event?.type === "raid-clear" || event?.type === "raid-progress",
  );
  const populationEvents = (Array.isArray(realmEvents) ? realmEvents : []).filter(
    (event) =>
      event?.message &&
      event?.type !== "raid-clear" &&
      event?.type !== "raid-progress",
  );
  raidEvents.slice(0, 2).forEach((event) => {
    if (event.type === "raid-clear") {
      addNews("raid-clear", `${event.guildName} cleared ${event.raidName}.`);
      return;
    }
    addNews(
      "raid-progress",
      `${event.guildName} pushed ${event.shortName} to ${event.clearedBosses}/${event.totalBosses} bosses.`,
    );
  });
  populationEvents.slice(0, Math.max(0, 2 - news.length)).forEach((event) => {
    addNews(event.type || "realm", event.message);
  });

  if (news.length < 2 && safeRandom() < 0.45) {
    const guild = pickGuild();
    addNews("dungeon", `${guild.name} cleared a dangerous dungeon wing.`);
  }
  if (news.length < 2 && safeRandom() < 0.3) {
    const guild = pickGuild();
    addNews("recruitment", `${guild.name} recruited several new adventurers.`);
  }
  if (news.length < 2 && dayIndex > 0 && dayIndex % 7 === 0) {
    const topGuild = rankings[0];
    if (topGuild) {
      addNews(
        "ranking",
        `${topGuild.name} holds Rank #1 in realm PvE progression.`,
      );
    }
  }
  if (news.length < 2 && playerGuildSnapshot) {
    const playerRank = rankings.find((row) => row.isPlayerGuild)?.rank;
    if (playerRank && playerRank <= 10 && safeRandom() < 0.35) {
      addNews(
        "player",
        `${playerGuildSnapshot.name} entered the top 10 realm ranking.`,
      );
    }
  }

  return news.slice(0, 2);
};
