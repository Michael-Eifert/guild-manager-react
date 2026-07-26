import ChatPanel from "../../components/chat/ChatPanel";
import type { ChatChannel, SocialState } from "../../social/chatTypes";

export default function ChatPage({
  socialState,
  guildName,
  onMarkRead,
}: {
  socialState: SocialState;
  guildName: string;
  onMarkRead: (channel: ChatChannel) => void;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-180px)] flex-col">
      <ChatPanel
        socialState={socialState}
        guildName={guildName}
        onMarkRead={onMarkRead}
      />
    </div>
  );
}
