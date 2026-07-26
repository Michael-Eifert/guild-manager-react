import React, { useId } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type DashboardAccordionSectionProps = {
  title: ReactNode;
  summary?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
};

const DashboardAccordionSection = ({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: DashboardAccordionSectionProps) => {
  const accordionId = useId();
  const triggerId = `${accordionId}-trigger`;
  const contentId = `${accordionId}-content`;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/70 shadow-md">
      <button
        type="button"
        id={triggerId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
      >
        <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
          {title}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-gray-400">
          {summary}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-600 bg-gray-950 text-sm text-gray-200">
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={`transition-transform motion-reduce:transition-none ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
        className="border-t border-gray-800 px-3 pb-3 pt-3"
      >
        {children}
      </div>
    </section>
  );
};

export default DashboardAccordionSection;
