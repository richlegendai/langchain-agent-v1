import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  readonly tone?: "neutral" | "success" | "danger" | "warning" | "accent";
};

const tones = {
  neutral: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]",
  success: "border-[#B8D9C7] bg-[#EDF8F1] text-[var(--success)]",
  danger: "border-[#F0C3BE] bg-[#FFF1F0] text-[var(--danger)]",
  warning: "border-[#E9D39C] bg-[#FFF8E6] text-[var(--warning)]",
  accent: "border-[#ADD8D3] bg-[#EBF7F5] text-[var(--accent)]",
} as const;

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
