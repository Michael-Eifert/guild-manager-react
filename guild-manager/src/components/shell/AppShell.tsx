import { Menu, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import BaseModal from "../modals/BaseModal";
import Badge from "../ui/Badge";
import type { NavigationGroup, NavigationItem } from "./navigationTypes";

type AppShellProps = {
  header: ReactNode;
  navigationItems: NavigationItem[];
  children: ReactNode;
};

const navigationGroups: Array<{
  id: NavigationGroup;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "activities", label: "Activities" },
  { id: "world", label: "World" },
  { id: "tools", label: "Tools" },
];

const toneClasses = {
  neutral: "",
  primary: "app-nav-item-primary",
  quest: "app-nav-item-quest",
  success: "app-nav-item-success",
  danger: "app-nav-item-danger",
};

const getItemClasses = (
  item: NavigationItem,
  active: boolean,
  compact = false,
) =>
  [
    "app-nav-item",
    compact ? "app-nav-item-compact" : "",
    toneClasses[item.tone || "neutral"],
    active ? "app-nav-item-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

const NavigationBadge = ({ item }: { item: NavigationItem }) =>
  item.badge && item.badge > 0 ? (
    <Badge tone={item.badgeTone}>{item.badge}</Badge>
  ) : null;

function NavigationControl({
  item,
  compact = false,
  rail = false,
  onSelected,
}: {
  item: NavigationItem;
  compact?: boolean;
  rail?: boolean;
  onSelected?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <span className="relative shrink-0">
        <Icon size={compact ? 20 : 19} strokeWidth={1.8} aria-hidden="true" />
        {compact && item.badge && item.badge > 0 ? (
          <span className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full border border-slate-950 bg-amber-400" />
        ) : null}
      </span>
      <span
        className={
          compact
            ? "max-w-full truncate text-[9px] leading-none"
            : rail
              ? "hidden min-w-0 flex-1 truncate xl:block"
              : "min-w-0 flex-1 truncate"
        }
      >
        {compact ? item.shortLabel || item.label : item.label}
      </span>
      {!compact ? (
        <span className={rail ? "hidden xl:inline-flex" : "inline-flex"}>
          <NavigationBadge item={item} />
        </span>
      ) : null}
    </>
  );

  if (item.kind === "route") {
    return (
      <NavLink
        to={item.to}
        end={item.to === "/home"}
        aria-label={item.label}
        title={compact || rail ? item.label : undefined}
        onClick={onSelected}
        className={({ isActive }) => getItemClasses(item, isActive, compact)}
      >
        {content}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      aria-label={item.label}
      title={compact || rail ? item.label : undefined}
      aria-pressed={item.active}
      disabled={item.disabled}
      onClick={() => {
        item.onSelect();
        onSelected?.();
      }}
      className={getItemClasses(item, Boolean(item.active), compact)}
    >
      {content}
    </button>
  );
}

function DesktopSidebar({ items }: { items: NavigationItem[] }) {
  return (
    <aside
      data-testid="desktop-navigation"
      className="app-sidebar hidden md:flex"
      aria-label="Game navigation"
    >
      <div className="app-sidebar-brand">
        <ShieldMark />
        <span className="hidden min-w-0 xl:block">
          <span className="fantasy-font block truncate text-sm font-bold">
            Guild Manager
          </span>
          <span className="block text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Command Center
          </span>
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-4">
        {navigationGroups.map((group) => {
          const groupItems = items.filter(
            (item) => item.group === group.id && !item.sidebarHidden,
          );
          if (groupItems.length === 0) return null;
          return (
            <div key={group.id} className="space-y-1">
              <div className="hidden px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600 xl:block">
                {group.label}
              </div>
              {groupItems.map((item) => (
                <NavigationControl
                  key={item.id}
                  item={item}
                  compact={false}
                  rail
                />
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function ShieldMark() {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-600/70 bg-gradient-to-b from-amber-700/50 to-amber-950 text-amber-100 shadow-inner">
      <span className="fantasy-font text-lg font-bold">G</span>
    </div>
  );
}

function MobileNavigation({
  items,
  moreOpen,
  onOpenMore,
}: {
  items: NavigationItem[];
  moreOpen: boolean;
  onOpenMore: () => void;
}) {
  const primaryItems = items
    .filter((item) => item.mobilePrimary)
    .sort((a, b) => (a.mobileOrder || 0) - (b.mobileOrder || 0));

  return (
    <nav
      data-testid="mobile-navigation"
      aria-label="Primary game navigation"
      className="app-mobile-nav md:hidden"
    >
      {primaryItems.map((item) => (
        <NavigationControl key={item.id} item={item} compact />
      ))}
      <button
        type="button"
        aria-label="More navigation"
        aria-expanded={moreOpen}
        onClick={onOpenMore}
        className={getItemClasses(
          {
            id: "more",
            label: "More",
            icon: Menu,
            group: "tools",
            kind: "action",
            onSelect: onOpenMore,
          },
          moreOpen,
          true,
        )}
      >
        <Menu size={20} aria-hidden="true" />
        <span className="text-[9px] leading-none">More</span>
      </button>
    </nav>
  );
}

export default function AppShell({
  header,
  navigationItems,
  children,
}: AppShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const drawerItems = navigationItems.filter((item) => !item.mobilePrimary);

  return (
    <div className="app-shell">
      <DesktopSidebar items={navigationItems} />
      <div className="app-shell-main">
        {header}
        <main className="app-shell-content">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>

      <MobileNavigation
        items={navigationItems}
        moreOpen={moreOpen}
        onOpenMore={() => setMoreOpen(true)}
      />

      <BaseModal
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        ariaLabel="More navigation"
        overlayClassName="items-end bg-black/70 backdrop-blur-sm md:hidden"
        panelClassName="wow-modal-panel max-h-[78vh] w-full overflow-hidden rounded-t-2xl border-x-0 border-b-0 border-t border-amber-800 bg-slate-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="fantasy-font text-lg font-bold text-amber-100">
              Command Menu
            </h2>
            <p className="text-[11px] text-slate-500">
              Guild, world and management tools
            </p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMoreOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav
          aria-label="More game navigation"
          className="grid max-h-[calc(78vh-76px)] grid-cols-2 gap-2 overflow-y-auto p-4"
        >
          {drawerItems.map((item) => (
            <NavigationControl
              key={item.id}
              item={item}
              onSelected={() => setMoreOpen(false)}
            />
          ))}
        </nav>
      </BaseModal>
    </div>
  );
}
