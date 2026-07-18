import { useCallback, useEffect, useRef, useState } from "react";

export const useNotifications = ({ createNotificationId, maximumVisible = 4 }) => {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef(new Map());

  const dismissNotification = useCallback((notificationId) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
    const timerId = timersRef.current.get(notificationId);
    if (timerId) window.clearTimeout(timerId);
    timersRef.current.delete(notificationId);
  }, []);

  const pushNotification = useCallback(
    (payload, fallbackType = "info", fallbackDurationMs = 4200) => {
      const normalized = typeof payload === "string"
        ? { message: payload, type: fallbackType, durationMs: fallbackDurationMs }
        : {
            message: payload?.message || "",
            title: payload?.title || "",
            type: payload?.type || fallbackType,
            durationMs: payload?.durationMs ?? fallbackDurationMs,
          };
      if (!normalized.message) return null;

      const notificationId = createNotificationId();
      setNotifications((current) => [
        ...current,
        { id: notificationId, message: normalized.message, title: normalized.title, type: normalized.type },
      ].slice(-maximumVisible));
      const timerId = window.setTimeout(() => {
        setNotifications((current) =>
          current.filter((notification) => notification.id !== notificationId),
        );
        timersRef.current.delete(notificationId);
      }, normalized.durationMs);
      timersRef.current.set(notificationId, timerId);
      return notificationId;
    },
    [createNotificationId, maximumVisible],
  );

  useEffect(() => () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current.clear();
  }, []);

  return { dismissNotification, notifications, pushNotification };
};
