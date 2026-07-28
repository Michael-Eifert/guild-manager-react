export const SESSION_EXPORT_NAME_STORAGE_KEY =
  "guild-manager.session-export-name.v1";

const getStorage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export const normalizePreferredSessionFilename = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/\.json$/i, "")
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[.\s-]+$/g, "")
    .slice(0, 100)
    .trim();

export const readPreferredSessionFilename = () =>
  normalizePreferredSessionFilename(
    getStorage()?.getItem(SESSION_EXPORT_NAME_STORAGE_KEY),
  );

export const writePreferredSessionFilename = (value: unknown) => {
  const storage = getStorage();
  if (!storage) return false;
  const normalized = normalizePreferredSessionFilename(value);
  if (normalized) {
    storage.setItem(SESSION_EXPORT_NAME_STORAGE_KEY, normalized);
  } else {
    storage.removeItem(SESSION_EXPORT_NAME_STORAGE_KEY);
  }
  return true;
};

export const getSessionDownloadFilename = (
  preferredName: unknown,
  now = new Date(),
) => {
  const normalized = normalizePreferredSessionFilename(preferredName);
  if (normalized) return `${normalized}.json`;
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  return `guild-session-${timestamp}.json`;
};
