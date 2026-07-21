import type { ComponentType } from "react";

import DungeonBoardPanel from "../../components/DungeonBoardPanel";
import type { Character } from "../../types/characterTypes";
import type { Mission } from "../../types/missionTypes";

type ForwardedCallback = (...args: never[]) => unknown;

type DungeonBoardPageProps = {
  roster: Character[];
  missionList: Mission[];
  activeMissions: Mission[];
  gameTimeMs: number;
  onManualFinish: ForwardedCallback;
  onQueueAdventureGoal: ForwardedCallback;
  onClearAdventureGoal: ForwardedCallback;
};

// Temporary adapter until DungeonBoardPanel itself is migrated from JSX.
const TypedDungeonBoardPanel = DungeonBoardPanel as ComponentType<DungeonBoardPageProps>;

export default function DungeonBoardPage({
  roster,
  missionList,
  activeMissions,
  gameTimeMs,
  onManualFinish,
  onQueueAdventureGoal,
  onClearAdventureGoal,
}: DungeonBoardPageProps) {
  return (
    <section className="wow-modal-panel min-h-[calc(100vh-220px)] overflow-hidden rounded-lg border-2 border-cyan-900 bg-gray-950 shadow-2xl">
      <header className="border-b border-cyan-900/60 bg-gray-950 px-4 py-3 md:px-5">
        <h2 className="fantasy-font truncate text-xl text-cyan-300 md:text-2xl">
          Dungeon Board
        </h2>
        <p className="truncate text-xs text-cyan-100/60 md:text-sm">
          Active dungeon runs, raids, and attunement planning
        </p>
      </header>
      <div className="p-3 md:p-4">
        <TypedDungeonBoardPanel
          roster={roster}
          missionList={missionList}
          activeMissions={activeMissions}
          gameTimeMs={gameTimeMs}
          onManualFinish={onManualFinish}
          onQueueAdventureGoal={onQueueAdventureGoal}
          onClearAdventureGoal={onClearAdventureGoal}
        />
      </div>
    </section>
  );
}
