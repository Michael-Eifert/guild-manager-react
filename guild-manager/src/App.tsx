import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { GameProvider } from "./app/GameProvider";
import { useGameSelector } from "./app/useGame";
import { ROUTES } from "./routes";
import AppErrorBoundary from "./components/AppErrorBoundary";
import LoadingFallback from "./components/LoadingFallback";

const HomeRoot = lazy(() => import("./pages/home/HomeRoot"));
const StartPage = lazy(() => import("./pages/start/StartPage"));

const RootRedirect = () => {
  const guildSetup = useGameSelector((game) => game.guildSetup);
  return (
    <Navigate
      to={guildSetup.hasStarted ? ROUTES.HOME : ROUTES.START}
      replace
    />
  );
};

const App = () => (
  <AppErrorBoundary>
    <GameProvider>
      <AppErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
        <Route path={ROUTES.START} element={<StartPage />} />
        <Route path={`${ROUTES.HOME}/*`} element={<HomeRoot />} />
        <Route
          path={ROUTES.BATTLEFIELDS_ALIAS}
          element={<Navigate to={ROUTES.BATTLEFIELDS} replace />}
        />
        <Route
          path={ROUTES.DUNGEON_BOARD_ALIAS}
          element={<Navigate to={ROUTES.DUNGEON_BOARD} replace />}
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </GameProvider>
  </AppErrorBoundary>
);

export default App;
