import type { LucideIcon } from "lucide-react";

export type NavigationGroup =
  | "overview"
  | "activities"
  | "world"
  | "tools";

type NavigationItemBase = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  group: NavigationGroup;
  badge?: number;
  badgeTone?: "neutral" | "amber" | "cyan" | "red" | "emerald";
  mobilePrimary?: boolean;
  mobileOrder?: number;
  sidebarHidden?: boolean;
  tone?: "neutral" | "primary" | "quest" | "success" | "danger";
};

export type NavigationItem =
  | (NavigationItemBase & {
      kind: "route";
      to: string;
    })
  | (NavigationItemBase & {
      kind: "action";
      onSelect: () => void;
      active?: boolean;
      disabled?: boolean;
    });
