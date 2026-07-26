import type { ReactNode } from "react";
import { ChevronsDown, ChevronsUp } from "lucide-react";

import GameButton from "../ui/GameButton";

type ActivityPanelState = {
  guildActivity: boolean;
  pvpActivity: boolean;
  dungeonGroups: boolean;
  guildComposition: boolean;
};

type ActivityPanelLayoutProps = {
  sectionsOpen: ActivityPanelState;
  onSetAllOpen: (isOpen: boolean) => void;
  guildActivity: ReactNode;
  pvpActivity: ReactNode;
  dungeonGroups: ReactNode;
  guildComposition: ReactNode;
};

const ACTIVITY_PANEL_KEYS: Array<keyof ActivityPanelState> = [
  "guildActivity",
  "pvpActivity",
  "dungeonGroups",
  "guildComposition",
];

export default function ActivityPanelLayout({
  sectionsOpen,
  onSetAllOpen,
  guildActivity,
  pvpActivity,
  dungeonGroups,
  guildComposition,
}: ActivityPanelLayoutProps) {
  const allOpen = ACTIVITY_PANEL_KEYS.every((key) => sectionsOpen[key]);
  const allClosed = ACTIVITY_PANEL_KEYS.every((key) => !sectionsOpen[key]);

  return (
    <section aria-labelledby="activity-panel-controls-heading">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3
          id="activity-panel-controls-heading"
          className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"
        >
          Activity controls
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <GameButton
            size="md"
            tone="ghost"
            disabled={allOpen}
            onClick={() => onSetAllOpen(true)}
            icon={<ChevronsDown size={15} aria-hidden="true" />}
          >
            Expand all
          </GameButton>
          <GameButton
            size="md"
            tone="ghost"
            disabled={allClosed}
            onClick={() => onSetAllOpen(false)}
            icon={<ChevronsUp size={15} aria-hidden="true" />}
          >
            Collapse all
          </GameButton>
        </div>
      </div>

      <div
        data-testid="activity-panel-columns"
        className="grid gap-3 xl:grid-cols-2 xl:items-start"
      >
        <div
          data-testid="activity-panel-column-left"
          className="contents xl:flex xl:flex-col xl:gap-3"
        >
          <div className="order-1 xl:order-none">{guildActivity}</div>
          <div className="order-3 xl:order-none">{dungeonGroups}</div>
        </div>
        <div
          data-testid="activity-panel-column-right"
          className="contents xl:flex xl:flex-col xl:gap-3"
        >
          <div className="order-2 xl:order-none">{pvpActivity}</div>
          <div className="order-4 xl:order-none">{guildComposition}</div>
        </div>
      </div>
    </section>
  );
}
