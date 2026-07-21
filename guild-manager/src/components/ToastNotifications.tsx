import React from "react";
import type { GameNotification } from "../app/gameTypes";

const TOAST_STYLE_BY_TYPE = {
  error: {
    container: "bg-red-950/90 border-red-700 text-red-100",
    close: "text-red-200 hover:text-white",
    icon: "✖",
  },
  achievement: {
    container: "bg-emerald-950/90 border-emerald-700 text-emerald-100",
    close: "text-emerald-200 hover:text-white",
    icon: "🏆",
  },
  info: {
    container: "bg-gray-900/90 border-gray-600 text-gray-100",
    close: "text-gray-300 hover:text-white",
    icon: "ℹ",
  },
};

const getToastStyle = (type: string) =>
  (TOAST_STYLE_BY_TYPE as Record<string, typeof TOAST_STYLE_BY_TYPE.info>)[type] ||
  TOAST_STYLE_BY_TYPE.info;

const ToastNotifications = ({
  notifications,
  onDismiss,
}: {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
}) => {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => {
        const style = getToastStyle(notification.type);
        return (
          <div
            key={notification.id}
            className={`pointer-events-auto min-w-[220px] max-w-[340px] px-3 py-2 rounded border shadow-lg text-sm flex items-start justify-between gap-2 ${style.container}`}
          >
            <div className="flex gap-2">
              <span className="text-base leading-none mt-0.5">{style.icon}</span>
              <div className="leading-tight">
                {notification.title && (
                  <div className="text-[11px] uppercase tracking-wide font-bold opacity-90 mb-0.5">
                    {notification.title}
                  </div>
                )}
                <div>{notification.message}</div>
              </div>
            </div>
            <button
              onClick={() => onDismiss(notification.id)}
              className={`text-xs ${style.close}`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastNotifications;
