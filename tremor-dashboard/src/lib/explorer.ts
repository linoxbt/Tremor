/**
 * Algorand block explorer links (Lora — supports mainnet + testnet).
 * Network follows NEXT_PUBLIC_ALGORAND_NETWORK or defaults to testnet.
 */

export type AlgoNetwork = "mainnet" | "testnet";

export function algoNetwork(): AlgoNetwork {
  const n = (process.env.NEXT_PUBLIC_ALGORAND_NETWORK || "testnet").toLowerCase();
  return n === "mainnet" ? "mainnet" : "testnet";
}

function loraBase(net: AlgoNetwork = algoNetwork()) {
  return `https://lora.algokit.io/${net}`;
}

/** Account / wallet page */
export function explorerAccountUrl(address: string, net?: AlgoNetwork): string {
  return `${loraBase(net)}/account/${encodeURIComponent(address)}`;
}

/** Transaction detail page */
export function explorerTxUrl(txId: string, net?: AlgoNetwork): string {
  return `${loraBase(net)}/transaction/${encodeURIComponent(txId)}`;
}

/** Asset (ASA) page */
export function explorerAssetUrl(assetId: string, net?: AlgoNetwork): string {
  return `${loraBase(net)}/asset/${encodeURIComponent(assetId)}`;
}
