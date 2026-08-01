"use client";

import { useState, type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cn, fmtPct } from "@/lib/utils";

export function Card({
  className,
  accent,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { accent?: boolean }) {
  return (
    <div className={cn(accent ? "glass-accent" : "glass", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 border-b border-cs-border px-3 py-2",
        className,
      )}
    >
      <div>
        <h2 className="text-[12px] font-semibold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[10px] text-cs-dim">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "green" | "red" | "amber" | "blue";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-cs-hover text-cs-muted border-cs-border",
    accent: "bg-[var(--accent-soft)] text-cs-accent border-[var(--accent-border)]",
    green: "bg-[var(--green-soft)] text-cs-green border-emerald-900/50",
    red: "bg-[var(--red-soft)] text-cs-red border-rose-900/50",
    amber: "bg-amber-950/40 text-cs-amber border-amber-900/40",
    blue: "bg-sky-950/40 text-cs-blue border-sky-900/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1 py-px text-[9px] font-medium uppercase tracking-wider",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Pct({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-medium",
        up
          ? "bg-[var(--green-soft)] text-cs-green"
          : "bg-[var(--red-soft)] text-cs-red",
        className,
      )}
    >
      {up ? "▲" : "▼"} {fmtPct(value).replace("+", "")}
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "soft";
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "bg-cs-accent text-white hover:brightness-110 border border-transparent",
    ghost: "bg-transparent text-cs-muted hover:text-white hover:bg-cs-hover border border-transparent",
    outline:
      "bg-transparent text-cs-muted hover:text-white border border-cs-border hover:border-cs-accent/50",
    soft: "bg-[var(--accent-soft)] text-cs-accent border border-[var(--accent-border)] hover:brightness-110",
  };
  const sizes = {
    sm: "h-7 px-2 text-[10px]",
    md: "h-8 px-3 text-[11px]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "green" | "red" | "default";
}) {
  return (
    <div className="glass px-2.5 py-2">
      <div className="text-[9px] font-medium uppercase tracking-wider text-cs-dim">{label}</div>
      <div
        className={cn(
          "num mt-0.5 text-[15px] font-semibold tracking-tight",
          tone === "green" && "text-cs-green",
          tone === "red" && "text-cs-red",
          (!tone || tone === "default") && "text-white",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-[9px] text-cs-dim">{hint}</div> : null}
    </div>
  );
}

export function TokenAvatar({
  symbol,
  size = 22,
  seed,
  address,
}: {
  symbol: string;
  size?: number;
  /** Asset id (ASA) or "0" for ALGO — used for real logo URL */
  seed?: string;
  /** Prefer address; falls back to seed */
  address?: string;
}) {
  const assetId = address ?? seed ?? "";
  const logoSrc =
    assetId !== "" && /^\d+$/.test(String(assetId))
      ? `https://asa-list.tinyman.org/assets/${assetId}/icon.png`
      : null;

  const letter = (symbol || "?").slice(0, 2).toUpperCase();
  let h = 0;
  const s = assetId || symbol;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;

  const [failed, setFailed] = useState(false);
  const showImg = Boolean(logoSrc) && !failed;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.34),
        background: showImg
          ? "#121218"
          : `linear-gradient(135deg, hsl(${h} 55% 40%), hsl(${(h + 40) % 360} 50% 30%))`,
      }}
      title={symbol}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc!}
          alt={symbol}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        letter
      )}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-cs-border border-t-cs-accent" />
      <p className="text-[11px] text-cs-dim">{label}</p>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="m-3 rounded-md border border-rose-900/50 bg-[var(--red-soft)] p-2.5 text-[11px] text-cs-red">
      {message}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <p className="text-[12px] font-medium text-white">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[10px] text-cs-dim">{body}</p> : null}
    </div>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-0 overflow-x-auto border-b border-cs-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "whitespace-nowrap px-2.5 py-1.5 text-[11px] font-medium transition-colors",
            active === t.id
              ? "tab-active text-white"
              : "text-cs-dim hover:text-cs-muted",
          )}
        >
          {t.label}
          {t.count != null ? (
            <span className="ml-1 num text-[9px] text-cs-dim">{t.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-7 w-full rounded-md border border-cs-border bg-cs-elevated px-2 text-[11px] text-white placeholder:text-cs-dim",
        className,
      )}
      {...props}
    />
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}
