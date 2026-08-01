"use client";

import { dexUrl } from "@/lib/dex";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

/**
 * Clickable DEX name — opens the exchange in a new tab.
 * Stops propagation so parent row links still work.
 */
export function DexLink({
  dex,
  className,
  showIcon = false,
}: {
  dex: string;
  className?: string;
  showIcon?: boolean;
}) {
  const href = dexUrl(dex);

  if (!href) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded border border-cs-border bg-cs-hover px-1 py-px text-[9px] font-medium uppercase tracking-wider text-cs-muted",
          className,
        )}
      >
        {dex}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Open ${dex}`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded border border-cs-border bg-cs-hover px-1 py-px text-[9px] font-medium uppercase tracking-wider text-cs-muted transition-colors hover:border-cs-accent/50 hover:text-cs-accent hover:underline",
        className,
      )}
    >
      {dex}
      {showIcon ? <ExternalLink className="h-2 w-2 opacity-70" /> : null}
    </a>
  );
}
