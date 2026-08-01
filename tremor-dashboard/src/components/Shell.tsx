"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/SearchModal";
import {
  LayoutDashboard,
  Search,
  ShieldAlert,
  Star,
  Wallet,
  BookOpen,
} from "lucide-react";

/** Public market nav — dashboard is intentionally omitted (direct URL only) */
const MARKET_NAV = [
  { href: "/", label: "Markets", exact: true },
  { href: "/trending", label: "Trending" },
  { href: "/new-pairs", label: "New" },
  { href: "/gainers", label: "Gainers" },
  { href: "/tokens", label: "Tokens" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/docs", label: "Docs" },
];

const OPS_NAV = [
  { href: "/ops", label: "Overview", icon: LayoutDashboard },
  { href: "/ops/revenue", label: "Revenue", icon: Wallet },
  { href: "/ops/risk", label: "Risk", icon: ShieldAlert },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Hide market chrome nav on ops pages only (dashboard uses minimal market chrome)
  const isOps = pathname.startsWith("/ops");
  const hideMarketNav =
    pathname.startsWith("/ops") || pathname.startsWith("/dashboard");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-cs-border bg-[rgba(7,7,10,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-10 max-w-[1600px] items-center gap-3 px-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-1.5">
            <Image
              src="/logo.png"
              alt="Tremor"
              width={24}
              height={24}
              className="h-6 w-6 rounded-md"
              priority
            />
            <div className="text-[12px] font-semibold tracking-tight text-white">
              Tremor
            </div>
          </Link>

          {!hideMarketNav ? (
            <nav className="hidden items-center gap-0 md:flex">
              {MARKET_NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                      active ? "bg-cs-hover text-white" : "text-cs-muted hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : isOps ? (
            <nav className="hidden items-center gap-0 md:flex">
              {OPS_NAV.map((item) => {
                const active =
                  item.href === "/ops" ? pathname === "/ops" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium",
                      active ? "bg-cs-hover text-white" : "text-cs-muted hover:text-white",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/watchlist"
              className={cn(
                "hidden h-7 items-center gap-1 rounded-md border border-cs-border px-2 text-[10px] text-cs-muted hover:text-white sm:inline-flex",
                pathname.startsWith("/watchlist") && "bg-cs-hover text-white",
              )}
              title="Watchlist"
            >
              <Star className="h-3 w-3" />
            </Link>
            <Link
              href="/docs"
              className={cn(
                "hidden h-7 items-center gap-1 rounded-md border border-cs-border px-2 text-[10px] text-cs-muted hover:text-white sm:inline-flex",
                pathname.startsWith("/docs") && "bg-cs-hover text-white",
              )}
              title="Docs"
            >
              <BookOpen className="h-3 w-3" />
            </Link>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-7 items-center gap-1.5 rounded-md border border-cs-border bg-cs-elevated px-2 text-[10px] text-cs-muted hover:text-white"
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-cs-border px-1 font-mono text-[8px] text-cs-dim sm:inline">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {!hideMarketNav ? (
          <div className="flex gap-0.5 overflow-x-auto border-t border-cs-border px-2 py-0.5 md:hidden">
            {MARKET_NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium",
                    active ? "bg-cs-hover text-white" : "text-cs-dim",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-3 sm:px-4">{children}</main>

      <footer className="border-t border-cs-border">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-1 px-3 py-4 text-[10px] text-cs-dim sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-cs-muted">
            <Image src="/logo.png" alt="" width={14} height={14} className="rounded-sm" />
            Tremor
          </span>
          <div className="flex flex-wrap items-center gap-3 text-cs-dim">
            <Link href="/docs" className="hover:text-white">
              Docs
            </Link>
            <Link href="/watchlist" className="hover:text-white">
              Watchlist
            </Link>
            <span>Qie market data</span>
          </div>
        </div>
      </footer>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
