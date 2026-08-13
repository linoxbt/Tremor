"use client";

import { useEffect } from "react";

/**
 * Fallback for errors thrown by the root layout itself (rare — Shell/nav
 * chrome). Must render its own <html>/<body> since it replaces the whole
 * root layout when triggered; can't rely on globals.css classes/fonts being
 * guaranteed to have loaded, so this stays plain and inline-styled.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root layout error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#0a0a0b",
          color: "#e5e5e5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600 }}>Tremor failed to load.</p>
        <p style={{ fontSize: 12, color: "#888", maxWidth: 380 }}>
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 4,
            height: 32,
            padding: "0 12px",
            borderRadius: 6,
            border: "1px solid #333",
            background: "#141414",
            color: "#fff",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
