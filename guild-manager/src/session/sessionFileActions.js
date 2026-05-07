import {
  buildSessionPayload,
  downloadSessionPayload,
  hydrateSessionData,
  parseSessionPayload,
} from "./sessionPersistence";

export const saveSessionFile = (sessionState) => {
  const payload = buildSessionPayload(sessionState);
  downloadSessionPayload(payload);
};

export const openSessionFilePicker = (sessionFileInputRef) => {
  sessionFileInputRef?.current?.click();
};

export const loadSessionFile = ({
  event,
  hydrateOptions,
  onLoaded,
  onInvalidSession,
  onReadError,
}) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payloadData = parseSessionPayload(reader.result);
      const loadedSession = hydrateSessionData({
        payloadData,
        ...hydrateOptions,
      });
      onLoaded?.(loadedSession);
    } catch (error) {
      onInvalidSession?.(error);
    }
  };
  reader.onerror = () => {
    onReadError?.();
  };
  reader.readAsText(file);
};
