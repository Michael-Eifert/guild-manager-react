import { MessageCircle, Shield, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ChatChannel, SocialState } from "../../social/chatTypes";
import { ensureSocialState } from "../../social/socialSimulation";

const CHANNELS: Array<{
  id: ChatChannel;
  label: string;
  icon: typeof Shield;
}> = [
  { id: "guild", label: "Guild", icon: Shield },
  { id: "general", label: "General", icon: Users },
];

export default function ChatPanel({
  socialState,
  guildName,
  onMarkRead,
  compact = false,
}: {
  socialState: SocialState | unknown;
  guildName: string;
  onMarkRead: (channel: ChatChannel) => void;
  compact?: boolean;
}) {
  const state = ensureSocialState(socialState);
  const [channel, setChannel] = useState<ChatChannel>("guild");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messages = useMemo(
    () =>
      state.messages
        .filter((message) => message.channel === channel)
        .sort((left, right) => left.sequence - right.sequence),
    [channel, state.messages],
  );

  useEffect(() => {
    onMarkRead(channel);
  }, [channel, messages.length, onMarkRead]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [channel, messages.length]);

  const getUnreadCount = (targetChannel: ChatChannel) =>
    state.messages.filter(
      (message) =>
        message.channel === targetChannel &&
        message.sequence >
          (state.lastReadSequenceByChannel[targetChannel] || 0),
    ).length;

  return (
    <section
      className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-950/95 ${
        compact ? "" : "rounded-xl border border-amber-900/60"
      }`}
      aria-label="Character chat"
    >
      <header className="border-b border-slate-800 bg-gradient-to-r from-amber-950/35 to-slate-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-amber-300" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="fantasy-font truncate text-base font-bold text-amber-100">
              Realm Chat
            </h2>
            <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">
              {guildName} · characters speak automatically
            </p>
          </div>
        </div>
      </header>

      <div
        className="sticky top-0 z-10 grid grid-cols-2 gap-1 border-b border-slate-800 bg-slate-950 p-2"
        role="tablist"
        aria-label="Chat channels"
      >
        {CHANNELS.map((entry) => {
          const Icon = entry.icon;
          const selected = channel === entry.id;
          const unread = getUnreadCount(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setChannel(entry.id)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                selected
                  ? "border-amber-500/70 bg-amber-950/55 text-amber-100"
                  : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {entry.label}
              {unread > 0 ? (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] text-slate-950">
                  {Math.min(unread, 99)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
      >
        {messages.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-6 text-center">
            <div>
              <MessageCircle
                size={28}
                className="mx-auto mb-2 text-slate-700"
                aria-hidden="true"
              />
              <p className="text-sm text-slate-400">The channel is quiet.</p>
              <p className="mt-1 text-xs text-slate-600">
                New messages appear as characters form groups.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isGuildMember = message.speaker?.source === "guild";
            return (
              <article
                key={message.id}
                className={`rounded-lg border p-2.5 ${
                  isGuildMember
                    ? "border-amber-600/65 bg-amber-950/25 shadow-sm shadow-amber-950/30"
                    : "border-slate-800 bg-slate-900/65"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`truncate text-xs font-bold ${
                      isGuildMember ? "text-amber-200" : "text-cyan-200"
                    }`}
                  >
                    {message.speaker?.name || "System"}
                  </span>
                  {message.speaker ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                        isGuildMember
                          ? "border-amber-700 bg-amber-950/70 text-amber-300"
                          : "border-slate-700 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {isGuildMember ? (
                        <>
                          <Shield size={10} aria-hidden="true" />
                          Guild
                        </>
                      ) : (
                        message.speaker.guildName || "Free Agent"
                      )}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {message.generationStatus === "pending"
                    ? "…"
                    : message.text || message.fallbackText}
                </p>
              </article>
            );
          })
        )}
      </div>

      <footer className="border-t border-slate-800 px-3 py-2 text-center text-[10px] text-slate-600">
        Chat is simulated. You do not need to reply.
      </footer>
    </section>
  );
}
