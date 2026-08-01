"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pct, TokenAvatar } from "@/components/ui";
import { DexLink } from "@/components/DexLink";
import { WatchButton } from "@/components/WatchButton";
import { fmtPrice, fmtUsd, shortAddr, tokenLabel, timeAgo, cn } from "@/lib/utils";

export type PairRow = {
  /** Canonical pool id — some API responses use pair_address instead */
  pool_address?: string;
  pair_address?: string;
  dex: string;
  token0: string;
  token1: string;
  price_usd: number;
  liquidity_usd: number;
  volume_24h: number;
  change_24h_pct: number;
  created_at?: string;
  symbol0?: string;
  symbol1?: string;
};

/** Resolve pool id from either field name returned by the API */
export function poolId(p: PairRow): string {
  return p.pool_address || p.pair_address || "";
}

type SortKey =
  | "volume_24h"
  | "liquidity_usd"
  | "change_24h_pct"
  | "price_usd"
  | "created_at";

export function PairTable({
  rows,
  showAge = false,
  dense = true,
}: {
  rows: PairRow[];
  showAge?: boolean;
  dense?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("volume_24h");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const list = rows.filter((p) => Boolean(poolId(p)));
    list.sort((a, b) => {
      let av = 0;
      let bv = 0;
      if (sort === "created_at") {
        av = a.created_at ? new Date(a.created_at).getTime() : 0;
        bv = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        av = Number(a[sort] ?? 0);
        bv = Number(b[sort] ?? 0);
      }
      return asc ? av - bv : bv - av;
    });
    return list;
  }, [rows, sort, asc]);

  function toggle(key: SortKey) {
    if (sort === key) setAsc(!asc);
    else {
      setSort(key);
      setAsc(false);
    }
  }

  function Th({
    k,
    children,
    right,
  }: {
    k?: SortKey;
    children: React.ReactNode;
    right?: boolean;
  }) {
    return (
      <th
        className={cn(right && "text-right", k && "cursor-pointer select-none hover:text-cs-muted")}
        onClick={k ? () => toggle(k) : undefined}
      >
        <span className="inline-flex items-center gap-0.5">
          {children}
          {k && sort === k ? <span className="text-cs-accent">{asc ? "↑" : "↓"}</span> : null}
        </span>
      </th>
    );
  }

  const av = dense ? 20 : 24;

  return (
    <div className="overflow-x-auto">
      <table className="market-table">
        <thead>
          <tr>
            <Th>#</Th>
            <th className="w-8" />
            <Th>Pair</Th>
            <Th>DEX</Th>
            <Th k="price_usd" right>
              Price
            </Th>
            <Th k="change_24h_pct" right>
              24h
            </Th>
            <Th k="volume_24h" right>
              Vol
            </Th>
            <Th k="liquidity_usd" right>
              Liq
            </Th>
            {showAge ? (
              <Th k="created_at" right>
                Age
              </Th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const id = poolId(p);
            const s0 = p.symbol0 || tokenLabel(p.token0);
            const s1 = p.symbol1 || tokenLabel(p.token1);
            return (
              <tr key={id}>
                <td className="num text-cs-dim">{i + 1}</td>
                <td>
                  <WatchButton
                    kind="pair"
                    address={id}
                    symbol={s0}
                    quote={s1}
                    size="sm"
                  />
                </td>
                <td>
                  <Link
                    href={`/pair/${encodeURIComponent(id)}`}
                    className="flex items-center gap-2 group"
                  >
                    <div className="relative">
                      <TokenAvatar symbol={s0} size={av} address={p.token0} />
                      <div className="absolute -bottom-0.5 -right-0.5 rounded-full ring-1 ring-cs-bg">
                        <TokenAvatar
                          symbol={s1}
                          size={Math.round(av * 0.55)}
                          address={p.token1}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-white group-hover:text-cs-accent">
                        {s0}
                        <span className="text-cs-dim">/{s1}</span>
                      </div>
                      <div className="num text-[9px] text-cs-dim">
                        {shortAddr(id, 6, 4)}
                      </div>
                    </div>
                  </Link>
                </td>
                <td>
                  <DexLink dex={p.dex} />
                </td>
                <td className="num text-right text-white">{fmtPrice(p.price_usd)}</td>
                <td className="text-right">
                  <Pct value={p.change_24h_pct} />
                </td>
                <td className="num text-right text-cs-muted">{fmtUsd(p.volume_24h)}</td>
                <td className="num text-right text-cs-muted">{fmtUsd(p.liquidity_usd)}</td>
                {showAge ? (
                  <td className="num text-right text-cs-dim">{timeAgo(p.created_at)}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!sorted.length ? (
        <div className="py-8 text-center text-[11px] text-cs-dim">No pairs match</div>
      ) : null}
    </div>
  );
}
