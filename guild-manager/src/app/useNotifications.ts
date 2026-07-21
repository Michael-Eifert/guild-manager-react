import { useCallback, useEffect, useRef, useState } from "react";

import type { GameNotification, NotificationInput, NotificationType } from "./gameTypes";

type NotificationOptions = {
  createNotificationId: () => string;
  maximumVisible?: number;
};

export const useNotifications = ({
  createNotificationId,
  maximumVisible = 4,
}: NotificationOptions) => {
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications((current) => current.filter(({ id }) => id !== notificationId));
    const timerId = timersRef.current.get(notificationId);
    if (timerId) window.clearTimeout(timerId);
    timersRef.current.delete(notificationId);
  }, []);

  const pushNotification = useCallback(
    (
      payload: string | NotificationInput,
      fallbackType: NotificationType = "info",
      fallbackDurationMs = 4200,
    ) => {
      const normalized = typeof payload === "string"
        ? { message: payload, title: "", type: fallbackType, durationMs: fallbackDurationMs }
        : {
            message: payload?.message || "",
            title: payload?.title || "",
            type: payload?.type || fallbackType,
            durationMs: payload?.durationMs ?? fallbackDurationMs,
          };
      if (!normalized.message) return null;

      const id = createNotificationId();
      setNotifications((current) => [
        ...current,
        { id, message: normalized.message, title: normalized.title, type: normalized.type },
      ].slice(-maximumVisible));
      const timerId = window.setTimeout(() => {
        setNotifications((current) => current.filter((notification) => notification.id !== id));
        timersRef.current.delete(id);
      }, normalized.durationMs);
      timersRef.current.set(id, timerId);
      return id;
    },
    [createNotificationId, maximumVisible],
  );

  useEffect(() => () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current.clear();
  }, []);

  return { dismissNotification, notifications, pushNotification };
};
