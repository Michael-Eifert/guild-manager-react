import ChatPanel from "../../components/chat/ChatPanel";
import type { ChatChannel, SocialState } from "../../social/chatTypes";
import type {
  GuildIncident,
  RelationsManagementMode,
} from "../../guildRelations/guildRelations";

export default function ChatPage({
  socialState,
  guildName,
  onMarkRead,
  incidents,
  managementMode,
  onResolveIncident,
}: {
  socialState: SocialState;
  guildName: string;
  onMarkRead: (channel: ChatChannel) => void;
  incidents?: GuildIncident[];
  managementMode?: RelationsManagementMode;
  onResolveIncident?: (incidentId: string, choiceId: string) => void;
}) {
  return (
    <div className="flex h-[calc(100dvh-180px)] max-h-[760px] min-h-0 flex-col overflow-hidden">
      <ChatPanel
        socialState={socialState}
        guildName={guildName}
        onMarkRead={onMarkRead}
        incidents={incidents}
        managementMode={managementMode}
        onResolveIncident={onResolveIncident}
      />
    </div>
  );
}
