import { Navigate } from "react-router-dom";

import GuildSetupScreen from "../../components/GuildSetupScreen";
import ToastNotifications from "../../components/ToastNotifications";
import { useGameActions, useGameSelector } from "../../app/useGame";
import { ROUTES } from "../../routes";

export default function StartPage() {
  const actions = useGameActions();
  const guildSetup = useGameSelector((game) => game.guildSetup);
  const gameSettings = useGameSelector((game) => game.gameSettings);
  const notifications = useGameSelector((game) => game.notifications);
  const sessionFileInputRef = useGameSelector((game) => game.sessionFileInputRef);

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
      />
    </>
  );
}
