import { Check, Menu, RotateCcw, SlidersHorizontal, X } from "lucide-react";
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

const MOBILE_QUICK_NAVIGATION_COUNT = 3;
export const MOBILE_QUICK_NAVIGATION_STORAGE_KEY =
  "guild-manager.mobileQuickNavigation.v1";

const getCustomizableItems = (items: NavigationItem[]) =>
  items.filter((item) => !item.mobileFixed && !item.sidebarHidden);

const getDefaultQuickNavigationIds = (items: NavigationItem[]) =>
  getCustomizableItems(items)
    .filter((item) => item.mobileDefault)
    .sort((a, b) => (a.mobileOrder || 0) - (b.mobileOrder || 0))
    .map((item) => item.id);

const normalizeQuickNavigationIds = (
  items: NavigationItem[],
  requestedIds: string[],
) => {
  const customizableItems = getCustomizableItems(items);
  const validIds = new Set(customizableItems.map((item) => item.id));
  const normalizedIds = requestedIds.filter(
    (id, index) => validIds.has(id) && requestedIds.indexOf(id) === index,
  );
  const fallbackIds = [
    ...getDefaultQuickNavigationIds(items),
    ...customizableItems.map((item) => item.id),
  ];

  for (const id of fallbackIds) {
    if (
      normalizedIds.length >= MOBILE_QUICK_NAVIGATION_COUNT ||
      normalizedIds.includes(id)
    ) {
      continue;
    }
    normalizedIds.push(id);
  }

  return normalizedIds.slice(0, MOBILE_QUICK_NAVIGATION_COUNT);
};

const loadQuickNavigationIds = (items: NavigationItem[]) => {
  if (typeof window === "undefined") {
    return normalizeQuickNavigationIds(
      items,
      getDefaultQuickNavigationIds(items),
    );
  }

  try {
    const storedIds = JSON.parse(
      window.localStorage.getItem(MOBILE_QUICK_NAVIGATION_STORAGE_KEY) || "[]",
    );
    return normalizeQuickNavigationIds(
      items,
      Array.isArray(storedIds)
        ? storedIds.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return normalizeQuickNavigationIds(
      items,
      getDefaultQuickNavigationIds(items),
    );
  }
};

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
  return (
    <nav
      data-testid="mobile-navigation"
      aria-label="Primary game navigation"
      className="app-mobile-nav md:hidden"
    >
      {items.map((item) => (
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

function QuickNavigationCustomizer({
  items,
  selectedIds,
  onToggle,
  onReset,
  onCancel,
  onSave,
}: {
  items: NavigationItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-semibold text-slate-100">Choose 3 shortcuts</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Home always stays in the first position. Tap three destinations in
          the order you want them to appear.
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-2"
        aria-label="Available mobile shortcuts"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const selectionIndex = selectedIds.indexOf(item.id);
          const isSelected = selectionIndex >= 0;
          const selectionLimitReached =
            selectedIds.length >= MOBILE_QUICK_NAVIGATION_COUNT;

          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={isSelected}
              disabled={!isSelected && selectionLimitReached}
              onClick={() => onToggle(item.id)}
              className={[
                "relative flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                "disabled:cursor-not-allowed disabled:opacity-35",
                isSelected
                  ? "border-amber-500/80 bg-amber-950/60 text-amber-100"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800",
              ].join(" ")}
            >
              <Icon size={20} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.label}
              </span>
              {isSelected ? (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500 text-xs font-bold text-slate-950">
                  {selectionIndex + 1}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          <RotateCcw size={16} aria-hidden="true" />
          Reset defaults
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              selectedIds.length !== MOBILE_QUICK_NAVIGATION_COUNT
            }
            onClick={onSave}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-500 bg-amber-700 px-4 text-sm font-bold text-amber-50 shadow-lg shadow-amber-950/30 hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={17} aria-hidden="true" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({
  header,
  navigationItems,
  children,
}: AppShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [quickNavigationIds, setQuickNavigationIds] = useState(() =>
    loadQuickNavigationIds(navigationItems),
  );
  const [draftQuickNavigationIds, setDraftQuickNavigationIds] = useState(
    quickNavigationIds,
  );
  const fixedMobileItems = navigationItems
    .filter((item) => item.mobileFixed)
    .sort((a, b) => (a.mobileOrder || 0) - (b.mobileOrder || 0));
  const quickMobileItems = quickNavigationIds
    .map((id) => navigationItems.find((item) => item.id === id))
    .filter((item): item is NavigationItem => Boolean(item));
  const mobileItems = [...fixedMobileItems, ...quickMobileItems];
  const mobileItemIds = new Set(mobileItems.map((item) => item.id));
  const drawerItems = navigationItems.filter(
    (item) => !mobileItemIds.has(item.id) && !item.sidebarHidden,
  );
  const customizableItems = getCustomizableItems(navigationItems);

  const closeMoreNavigation = () => {
    setMoreOpen(false);
    setCustomizerOpen(false);
  };

  const openCustomizer = () => {
    setDraftQuickNavigationIds(quickNavigationIds);
    setCustomizerOpen(true);
  };

  const toggleDraftQuickNavigation = (id: string) => {
    setDraftQuickNavigationIds((currentIds) => {
      if (currentIds.includes(id)) {
        return currentIds.filter((currentId) => currentId !== id);
      }
      if (currentIds.length >= MOBILE_QUICK_NAVIGATION_COUNT) {
        return currentIds;
      }
      return [...currentIds, id];
    });
  };

  const saveQuickNavigation = () => {
    if (
      draftQuickNavigationIds.length !== MOBILE_QUICK_NAVIGATION_COUNT
    ) {
      return;
    }

    const normalizedIds = normalizeQuickNavigationIds(
      navigationItems,
      draftQuickNavigationIds,
    );
    setQuickNavigationIds(normalizedIds);
    try {
      window.localStorage.setItem(
        MOBILE_QUICK_NAVIGATION_STORAGE_KEY,
        JSON.stringify(normalizedIds),
      );
    } catch {
      // The selection remains active for this session if storage is blocked.
    }
    closeMoreNavigation();
  };

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
        items={mobileItems}
        moreOpen={moreOpen}
        onOpenMore={() => {
          setCustomizerOpen(false);
          setMoreOpen(true);
        }}
      />

      <BaseModal
        isOpen={moreOpen}
        onClose={closeMoreNavigation}
        ariaLabel="More navigation"
        overlayClassName="items-end bg-black/70 backdrop-blur-sm md:hidden"
        panelClassName="wow-modal-panel max-h-[78vh] w-full overflow-hidden rounded-t-2xl border-x-0 border-b-0 border-t border-amber-800 bg-slate-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 className="fantasy-font text-lg font-bold text-amber-100">
              {customizerOpen ? "Quick Access" : "Command Menu"}
            </h2>
            <p className="text-[11px] text-slate-500">
              {customizerOpen
                ? "Choose your mobile navigation"
                : "Guild, world and management tools"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMoreNavigation}
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(78vh-76px)] overflow-y-auto">
          {customizerOpen ? (
            <QuickNavigationCustomizer
              items={customizableItems}
              selectedIds={draftQuickNavigationIds}
              onToggle={toggleDraftQuickNavigation}
              onReset={() =>
                setDraftQuickNavigationIds(
                  normalizeQuickNavigationIds(
                    navigationItems,
                    getDefaultQuickNavigationIds(navigationItems),
                  ),
                )
              }
              onCancel={() => setCustomizerOpen(false)}
              onSave={saveQuickNavigation}
            />
          ) : (
            <>
              <div className="px-4 pt-4">
                <button
                  type="button"
                  aria-label="Customize quick access"
                  onClick={openCustomizer}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-amber-700/70 bg-amber-950/40 px-4 text-left text-amber-100 transition-colors hover:border-amber-600 hover:bg-amber-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <SlidersHorizontal
                    size={20}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">
                      Customize quick access
                    </span>
                    <span className="block text-[11px] text-amber-200/60">
                      Home + 3 destinations
                    </span>
                  </span>
                </button>
              </div>
              <nav
                aria-label="More game navigation"
                className="grid grid-cols-2 gap-2 p-4"
              >
                {drawerItems.map((item) => (
                  <NavigationControl
                    key={item.id}
                    item={item}
                    onSelected={closeMoreNavigation}
                  />
                ))}
              </nav>
            </>
          )}
        </div>
      </BaseModal>
    </div>
  );
}
