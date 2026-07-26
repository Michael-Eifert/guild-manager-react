import type { ButtonHTMLAttributes, ReactNode } from "react";

const joinClasses = (...classNames: Array<string | undefined | false>) =>
  classNames.filter(Boolean).join(" ");

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export default function IconButton({
  label,
  icon,
  active = false,
  className,
  type = "button",
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={joinClasses(
        "inline-grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-600 bg-slate-900/80 text-slate-200 shadow-sm transition",
        "hover:-translate-y-px hover:border-amber-500/70 hover:bg-slate-800 hover:text-white active:translate-y-0 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "disabled:cursor-not-allowed disabled:opacity-45",
        active &&
          "border-amber-400 bg-amber-950/70 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.18)]",
        className,
      )}
      {...buttonProps}
    >
      {icon}
    </button>
  );
}
