export const DEFAULT_GUILD_ROLE_SUMMARY = Object.freeze({
  total: 0,
  Tank: 0,
  Healer: 0,
  DPS: 0,
});

export const getGuildRoleSummary = (roster) => {
  const members = Array.isArray(roster) ? roster : [];
  return members.reduce(
    (summary, member) => {
      const role = String(member?.role || "").trim();
      return {
        ...summary,
        total: summary.total + 1,
        ...(role === "Tank" ||
        role === "Healer" ||
        role === "DPS"
          ? { [role]: summary[role] + 1 }
          : {}),
      };
    },
    { ...DEFAULT_GUILD_ROLE_SUMMARY },
  );
};

export const getGuildClassSummary = (roster) => {
  const members = Array.isArray(roster) ? roster : [];
  const classCounts = members.reduce((counts, member) => {
    const className = String(
      member?.charClass || member?.class || member?.className || "",
    ).trim();
    if (!className) return counts;
    return {
      ...counts,
      [className]: (counts[className] || 0) + 1,
    };
  }, {});

  return Object.entries(classCounts)
    .map(([className, count]) => ({ className, count }))
    .sort(
      (first, second) =>
        second.count - first.count ||
        first.className.localeCompare(second.className),
    );
};
