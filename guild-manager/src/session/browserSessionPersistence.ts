export const BROWSER_SESSION_STORAGE_KEY =
  "guild-manager.browser-autosave.v1";

const getStorage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export const readBrowserSession = () =>
  getStorage()?.getItem(BROWSER_SESSION_STORAGE_KEY) || null;

export const writeBrowserSession = (
  payload: unknown,
  raw = false,
) => {
  const storage = getStorage();
  if (!storage) return false;
  storage.setItem(
    BROWSER_SESSION_STORAGE_KEY,
    raw ? String(payload) : JSON.stringify(payload),
  );
  return true;
};

export const clearBrowserSession = () =>
  getStorage()?.removeItem(BROWSER_SESSION_STORAGE_KEY);
