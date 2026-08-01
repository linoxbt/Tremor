"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isWatched,
  toggleWatch,
  type WatchItem,
} from "@/lib/watchlist";

export function WatchButton({
  kind,
  address,
  symbol,
  quote,
  name,
  className,
  size = "md",
}: {
  kind: WatchItem["kind"];
  address: string;
  symbol: string;
  quote?: string;
  name?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isWatched(kind, address));
    function sync() {
      setOn(isWatched(kind, address));
    }
    window.addEventListener("tremor-watchlist", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("tremor-watchlist", sync);
      window.removeEventListener("storage", sync);
    };
  }, [kind, address]);

  return (
    <button
      type="button"
      title={on ? "Remove from watchlist" : "Add to watchlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWatch({ kind, address, symbol, quote, name });
        setOn(isWatched(kind, address));
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md border transition-colors",
        size === "sm" ? "h-6 w-6" : "h-7 w-7",
        on
          ? "border-cs-accent/40 bg-cs-accent/15 text-cs-accent"
          : "border-cs-border text-cs-dim hover:border-cs-accent/30 hover:text-cs-accent",
        className,
      )}
    >
      <Star
        className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
        fill={on ? "currentColor" : "none"}
      />
    </button>
  );
}
