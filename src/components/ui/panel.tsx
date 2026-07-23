import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-[10px] border border-[var(--border)] bg-white", className)}
      {...props}
    />
  );
}
