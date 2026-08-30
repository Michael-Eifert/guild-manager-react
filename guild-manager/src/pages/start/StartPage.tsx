import { Navigate } from "react-router-dom";

import GuildSetupScreen from "../../components/GuildSetupScreen";
import BrowserSaveSlotsModal from "../../components/modals/BrowserSaveSlotsModal";
import ToastNotifications from "../../components/ToastNotifications";
import { useGameActions, useGameSelector } from "../../app/useGame";
import { ROUTES } from "../../routes";
import { useState } from "react";

export default function StartPage() {
  const [showBrowserSaves, setShowBrowserSaves] = useState(false);
  const actions = useGameActions();
  const guildSetup = useGameSelector((game) => game.guildSetup);
  const gameSettings = useGameSelector((game) => game.gameSettings);
  const notifications = useGameSelector((game) => game.notifications);
  const sessionFileInputRef = useGameSelector((game) => game.sessionFileInputRef);
  const browserSaveSlots = useGameSelector((game) => game.browserSaveSlots || []);

  if (guildSetup.hasStarted) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <>
      <ToastNotifications
        notifications={notifications}
        onDismiss={actions.dismissNotification}
      />
      <input
        ref={sessionFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={actions.loadSessionFile}
      />
      <GuildSetupScreen
        guildSetup={guildSetup}
        gameSettings={gameSettings}
        onChange={actions.changeGuildSetup}
        onGameSettingsChange={actions.updateGameSettings}
        onStart={actions.startGuild}
        onLoadSession={actions.loadSession}
        onOpenBrowserSaves={() => setShowBrowserSaves(true)}
      />
      <BrowserSaveSlotsModal
        isOpen={showBrowserSaves}
        onClose={() => setShowBrowserSaves(false)}
        slots={browserSaveSlots}
        onLoadBrowserSave={actions.loadBrowserSave}
      />
    </>
  );
}
