import React, { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { GameProvider } from "./app/GameProvider";
import { useGame } from "./app/useGame";
import { ROUTES } from "./routes";

const HomeRoot = lazy(() => import("./pages/home/HomeRoot"));
const StartPage = lazy(() => import("./pages/start/StartPage"));

const RootRedirect = () => {
  const { guildSetup } = useGame();
  return (
    <Navigate
      to={guildSetup.hasStarted ? ROUTES.HOME : ROUTES.START}
      replace
    />
  );
};

const App = () => (
  <GameProvider>
    <Suspense fallback={null}>
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
  </GameProvider>
);

export default App;
