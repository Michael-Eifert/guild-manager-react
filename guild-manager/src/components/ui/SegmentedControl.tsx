import type { CSSProperties, ReactNode } from "react";

type SegmentedControlOption<Value extends string> = {
  value: Value;
  label: ReactNode;
  title?: string;
};

type SegmentedControlProps<Value extends string> = {
  ariaLabel: string;
  options: ReadonlyArray<SegmentedControlOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
  disabled?: boolean;
  tone?: "amber" | "sky" | "emerald" | "red";
  className?: string;
};

const activeToneClasses = {
  amber: "border-amber-400 bg-amber-900/55 text-amber-50",
  sky: "border-sky-400 bg-sky-900/55 text-sky-50",
  emerald: "border-emerald-400 bg-emerald-900/50 text-emerald-50",
  red: "border-red-400 bg-red-900/50 text-red-50",
};

export default function SegmentedControl<Value extends string>({
  ariaLabel,
  options,
  value,
  onChange,
  disabled = false,
  tone = "amber",
  className,
}: SegmentedControlProps<Value>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`grid grid-cols-2 gap-1 rounded-lg border border-slate-700 bg-slate-950/70 p-1 sm:[grid-template-columns:repeat(var(--segment-count),minmax(0,1fr))] ${className || ""}`}
      style={
        {
          "--segment-count": options.length,
        } as CSSProperties
      }
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`min-h-10 rounded-md border px-2 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-45 ${
              isActive
                ? activeToneClasses[tone]
                : "border-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
