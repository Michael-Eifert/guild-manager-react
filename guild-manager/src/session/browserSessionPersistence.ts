export const BROWSER_SESSION_STORAGE_KEY =
  "guild-manager.browser-autosave.v1";
export const BROWSER_ACTIVE_SESSION_STORAGE_KEY =
  "guild-manager.browser-active-save.v1";
export const BROWSER_SAVE_SLOT_COUNT = 3;

export type BrowserSaveSlotId = 1 | 2 | 3;

export type BrowserSaveSlotSummary = {
  id: BrowserSaveSlotId;
  active: boolean;
  hasSave: boolean;
  guildName: string | null;
  savedAt: string | null;
  gameDay: number | null;
};

const SLOT_IDS: BrowserSaveSlotId[] = [1, 2, 3];
const SLOT_STORAGE_KEYS: Record<BrowserSaveSlotId, string> = {
  1: BROWSER_SESSION_STORAGE_KEY,
  2: `${BROWSER_SESSION_STORAGE_KEY}.slot-2`,
  3: `${BROWSER_SESSION_STORAGE_KEY}.slot-3`,
};
const GAME_DAY_MS = 10 * 60 * 1000;

const getStorage = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

const normalizeSlotId = (value: unknown): BrowserSaveSlotId | null => {
  const numeric = Number(value);
  return SLOT_IDS.includes(numeric as BrowserSaveSlotId)
    ? (numeric as BrowserSaveSlotId)
    : null;
};

const readExplicitActiveSlot = () =>
  normalizeSlotId(getStorage()?.getItem(BROWSER_ACTIVE_SESSION_STORAGE_KEY));

const readSlot = (slotId: BrowserSaveSlotId) =>
  getStorage()?.getItem(SLOT_STORAGE_KEYS[slotId]) || null;

const getSavedAtTimestamp = (rawSession: string | null) => {
  if (!rawSession) return Number.NEGATIVE_INFINITY;
  try {
    const savedAt = Date.parse(JSON.parse(rawSession)?.savedAt || "");
    return Number.isFinite(savedAt) ? savedAt : 0;
  } catch {
    return 0;
  }
};

const findNewestSlot = (): BrowserSaveSlotId | null => {
  const populated = SLOT_IDS
    .map((id) => ({ id, raw: readSlot(id) }))
    .filter((entry) => Boolean(entry.raw));
  if (populated.length === 0) return null;
  populated.sort(
    (left, right) =>
      getSavedAtTimestamp(right.raw) - getSavedAtTimestamp(left.raw) ||
      left.id - right.id,
  );
  return populated[0].id;
};

export const getActiveBrowserSaveSlot = (): BrowserSaveSlotId =>
  readExplicitActiveSlot() || findNewestSlot() || 1;

export const setActiveBrowserSaveSlot = (slotId: BrowserSaveSlotId) => {
  const storage = getStorage();
  if (!storage) return false;
  storage.setItem(BROWSER_ACTIVE_SESSION_STORAGE_KEY, String(slotId));
  return true;
};

export const readBrowserSession = (slotId?: BrowserSaveSlotId) => {
  const explicitActive = readExplicitActiveSlot();
  const resolvedSlot =
    slotId || explicitActive || findNewestSlot() || getActiveBrowserSaveSlot();
  return readSlot(resolvedSlot);
};

export const writeBrowserSession = (
  payload: unknown,
  raw = false,
  slotId = getActiveBrowserSaveSlot(),
) => {
  const storage = getStorage();
  if (!storage) return false;
  storage.setItem(
    SLOT_STORAGE_KEYS[slotId],
    raw ? String(payload) : JSON.stringify(payload),
  );
  setActiveBrowserSaveSlot(slotId);
  return true;
};

export const clearBrowserSession = (slotId = getActiveBrowserSaveSlot()) =>
  getStorage()?.removeItem(SLOT_STORAGE_KEYS[slotId]);

export const prepareNewBrowserSession = (slotId: BrowserSaveSlotId) => {
  const storage = getStorage();
  if (!storage) return false;
  storage.removeItem(SLOT_STORAGE_KEYS[slotId]);
  storage.setItem(BROWSER_ACTIVE_SESSION_STORAGE_KEY, String(slotId));
  return true;
};

const summarizeSlot = (
  id: BrowserSaveSlotId,
  activeSlot: BrowserSaveSlotId,
): BrowserSaveSlotSummary => {
  const rawSession = readSlot(id);
  if (!rawSession) {
    return {
      id,
      active: id === activeSlot,
      hasSave: false,
      guildName: null,
      savedAt: null,
      gameDay: null,
    };
  }

  try {
    const payload = JSON.parse(rawSession);
    const gameTimeMs = Number(payload?.data?.progression?.gameTimeMs);
    const epoch = Number(payload?.data?.calendarState?.calendarEpochGameTimeMs);
    const gameDay =
      Number.isFinite(gameTimeMs) && Number.isFinite(epoch)
        ? Math.max(1, Math.floor((gameTimeMs - epoch) / GAME_DAY_MS) + 1)
        : null;
    return {
      id,
      active: id === activeSlot,
      hasSave: true,
      guildName:
        String(payload?.data?.guildSetup?.name || "").trim() || "Unnamed Guild",
      savedAt:
        typeof payload?.savedAt === "string" ? payload.savedAt : null,
      gameDay,
    };
  } catch {
    return {
      id,
      active: id === activeSlot,
      hasSave: true,
      guildName: "Unreadable Save",
      savedAt: null,
      gameDay: null,
    };
  }
};

export const listBrowserSaveSlots = (): BrowserSaveSlotSummary[] => {
  const activeSlot = getActiveBrowserSaveSlot();
  return SLOT_IDS.map((id) => summarizeSlot(id, activeSlot));
};
