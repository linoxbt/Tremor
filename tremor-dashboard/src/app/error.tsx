"use client";

import { useEffect } from "react";

/**
 * Next.js App Router error boundary — catches any render-time exception in a
 * page (e.g. an unguarded field access on an unexpected API response shape)
 * so it degrades to this instead of a blank/generic crash screen. Layout
 * (Shell nav) stays mounted around this.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <p className="text-[13px] font-medium text-white">Something went wrong loading this page.</p>
      <p className="max-w-sm text-[11px] text-cs-dim">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-1 h-8 rounded-md border border-cs-border bg-cs-elevated px-3 text-[11px] font-medium text-white hover:border-cs-accent/50 hover:text-cs-accent"
      >
        Try again
      </button>
    </div>
  );
}
