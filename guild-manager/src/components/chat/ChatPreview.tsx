import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "../../routes";
import type { SocialState } from "../../social/chatTypes";
import { ensureSocialState } from "../../social/socialSimulation";

export default function ChatPreview({
  socialState,
  unreadCount,
}: {
  socialState: SocialState | unknown;
  unreadCount: number;
}) {
  const messages = ensureSocialState(socialState).messages.slice(-4).reverse();
  return (
    <section className="rounded-xl border border-amber-900/55 bg-slate-950/70 p-3 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={17} className="text-amber-300" aria-hidden="true" />
          <h3 className="fantasy-font text-sm font-bold text-amber-100">
            Character Chat
          </h3>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-slate-950">
              {Math.min(unreadCount, 99)} new
            </span>
          ) : null}
        </div>
        <Link
          to={ROUTES.CHAT}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-amber-600 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Open chat
        </Link>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500">
            The guild channel is quiet. LFG messages will appear here.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg border px-2.5 py-2 ${
                message.contentKind === "roleplay"
                  ? "border-violet-800/70 bg-violet-950/25"
                  : message.speaker?.source === "guild"
                  ? "border-amber-800/65 bg-amber-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                <span className="min-w-0 truncate">
                  {message.channel} · {message.speaker?.name || "System"}
                </span>
                {message.sceneTag ? (
                  <span className="flex-none rounded border border-violet-800 bg-violet-950/70 px-1.5 py-0.5 text-[8px] text-violet-200">
                    {message.sceneTag}
                  </span>
                ) : null}
                {message.intent === "mission-failed" ? (
                  <span className="flex-none rounded border border-rose-800 bg-rose-950/70 px-1.5 py-0.5 text-[8px] text-rose-200">
                    Mission Failed
                  </span>
                ) : null}
                {message.intent === "mission-success" ? (
                  <span className="flex-none rounded border border-emerald-800 bg-emerald-950/70 px-1.5 py-0.5 text-[8px] text-emerald-200">
                    Mission Accomplished
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                {message.text || message.fallbackText}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
