import { Navigate } from "react-router-dom";

import GuildSetupScreen from "../../components/GuildSetupScreen";
import ToastNotifications from "../../components/ToastNotifications";
import { useGame } from "../../app/useGame";
import { ROUTES } from "../../routes";

export default function StartPage() {
  const {
    dismissNotification,
    guildSetup,
    handleGuildSetupChange,
    handleLoadButtonClick,
    handleLoadSessionFile,
    handleStartGuild,
    notifications,
    sessionFileInputRef,
  } = useGame();

  if (guildSetup.hasStarted) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <>
      <ToastNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      <input
        ref={sessionFileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleLoadSessionFile}
      />
      <GuildSetupScreen
        guildSetup={guildSetup}
        onChange={handleGuildSetupChange}
        onStart={handleStartGuild}
        onLoadSession={handleLoadButtonClick}
      />
    </>
  );
}
