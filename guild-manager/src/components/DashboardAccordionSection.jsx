import React from "react";

const DashboardAccordionSection = ({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}) => (
  <section className="rounded border border-gray-700 bg-gray-900/70">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
    >
      <span className="text-xs uppercase tracking-wider text-gray-300 font-bold">
        {title}
      </span>
      <span className="flex items-center gap-2 text-[11px] text-gray-400">
        {summary}
        <span className="flex h-6 w-6 items-center justify-center rounded border border-gray-600 bg-gray-950 text-sm text-gray-200">
          {isOpen ? "-" : "+"}
        </span>
      </span>
    </button>
    {isOpen && (
      <div className="border-t border-gray-800 px-3 pb-3 pt-2">{children}</div>
    )}
  </section>
);

export default DashboardAccordionSection;
