import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "amber" | "cyan" | "red" | "emerald";
  className?: string;
};

const toneClasses = {
  neutral: "border-slate-600 bg-slate-800 text-slate-200",
  amber: "border-amber-500/70 bg-amber-400/15 text-amber-100",
  cyan: "border-cyan-500/70 bg-cyan-400/15 text-cyan-100",
  red: "border-red-500/70 bg-red-400/15 text-red-100",
  emerald: "border-emerald-500/70 bg-emerald-400/15 text-emerald-100",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${toneClasses[tone]} ${className || ""}`}
    >
      {children}
    </span>
  );
}
