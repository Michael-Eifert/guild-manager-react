import type { ButtonHTMLAttributes, ReactNode } from "react";

type GameButtonTone =
  | "neutral"
  | "primary"
  | "quest"
  | "success"
  | "danger"
  | "ghost";

type GameButtonSize = "sm" | "md" | "lg";

const toneClasses: Record<GameButtonTone, string> = {
  neutral:
    "border-slate-600 bg-slate-800/90 text-slate-100 hover:border-slate-400 hover:bg-slate-700",
  primary:
    "border-amber-600 bg-gradient-to-b from-amber-700 to-amber-950 text-amber-50 hover:border-amber-300 hover:from-amber-600 hover:to-amber-900",
  quest:
    "border-sky-700 bg-gradient-to-b from-sky-800 to-slate-950 text-sky-50 hover:border-sky-400 hover:from-sky-700",
  success:
    "border-emerald-700 bg-emerald-950/80 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-900/80",
  danger:
    "border-red-800 bg-red-950/80 text-red-100 hover:border-red-500 hover:bg-red-900/80",
  ghost:
    "border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/70 hover:text-white",
};

const sizeClasses: Record<GameButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-11 px-4 py-2 text-sm",
  lg: "min-h-12 px-5 py-2.5 text-sm",
};

const joinClasses = (...classNames: Array<string | undefined | false>) =>
  classNames.filter(Boolean).join(" ");

export type GameButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: GameButtonTone;
  size?: GameButtonSize;
  active?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
};

const getGameButtonClasses = ({
  tone = "neutral",
  size = "md",
  active = false,
  fullWidth = false,
}: Pick<GameButtonProps, "tone" | "size" | "active" | "fullWidth"> = {}) =>
  joinClasses(
    "game-button inline-flex items-center justify-center gap-2 rounded-lg border font-bold shadow-sm transition duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    "enabled:hover:-translate-y-px enabled:active:translate-y-0 enabled:active:scale-[0.98]",
    "disabled:cursor-not-allowed disabled:opacity-45",
    toneClasses[tone],
    sizeClasses[size],
    active &&
      "border-amber-300 text-amber-50 ring-1 ring-amber-300/60 shadow-[0_0_18px_rgba(251,191,36,0.2)]",
    fullWidth && "w-full",
  );

export default function GameButton({
  tone = "neutral",
  size = "md",
  active = false,
  fullWidth = false,
  icon,
  className,
  children,
  type = "button",
  ...buttonProps
}: GameButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(
        getGameButtonClasses({ tone, size, active, fullWidth }),
        className,
      )}
      {...buttonProps}
    >
      {icon}
      {children}
    </button>
  );
}
