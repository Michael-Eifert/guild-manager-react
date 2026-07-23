import type { Character } from "../types/characterTypes";

export const normalizeGuildMemberSearch = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const getGuildMemberSearchScore = (
  member: Pick<Character, "name">,
  searchTerm: unknown,
) => {
  const query = normalizeGuildMemberSearch(searchTerm);
  const name = normalizeGuildMemberSearch(member?.name);
  if (!query || !name) return 0;
  if (name === query) return 1000;
  if (name.startsWith(query))
    return 850 - Math.max(0, name.length - query.length);

  const includesAt = name.indexOf(query);
  if (includesAt >= 0) return 700 - includesAt * 10;

  let queryIndex = 0;
  let gaps = 0;
  for (
    let nameIndex = 0;
    nameIndex < name.length && queryIndex < query.length;
    nameIndex += 1
  ) {
    if (name[nameIndex] === query[queryIndex]) {
      queryIndex += 1;
    } else if (queryIndex > 0) {
      gaps += 1;
    }
  }

  if (queryIndex === query.length) {
    return 400 - gaps * 5 - Math.max(0, name.length - query.length);
  }

  const queryLetters = new Set(query);
  const sharedLetters = [...new Set(name)].filter((letter) =>
    queryLetters.has(letter),
  ).length;
  return sharedLetters > 0 ? sharedLetters * 20 : 0;
};
