"use client";

import { explorerAccountUrl, explorerTxUrl } from "@/lib/explorer";
import { shortAddr, cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export function ExplorerAccountLink({
  address,
  className,
  charsLeft = 6,
  charsRight = 4,
}: {
  address: string;
  className?: string;
  charsLeft?: number;
  charsRight?: number;
}) {
  if (!address) return <span className="text-cs-dim">—</span>;
  return (
    <a
      href={explorerAccountUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      title={`View ${address} on explorer`}
      className={cn(
        "num inline-flex items-center gap-0.5 text-cs-accent hover:underline",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {shortAddr(address, charsLeft, charsRight)}
      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
    </a>
  );
}

export function ExplorerTxLink({
  txId,
  className,
  charsLeft = 6,
  charsRight = 4,
}: {
  txId: string;
  className?: string;
  charsLeft?: number;
  charsRight?: number;
}) {
  if (!txId) return <span className="text-cs-dim">—</span>;
  return (
    <a
      href={explorerTxUrl(txId)}
      target="_blank"
      rel="noopener noreferrer"
      title={`View tx ${txId} on explorer`}
      className={cn(
        "num inline-flex items-center gap-0.5 text-cs-muted hover:text-cs-accent hover:underline",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {shortAddr(txId, charsLeft, charsRight)}
      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
    </a>
  );
}
