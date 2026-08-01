/**
 * Qie block explorer (Blockscout) — defaults to mainnet.
 */

export type QieNetwork = "mainnet" | "testnet";

export function qieNetwork(): QieNetwork {
  const n = (
    process.env.NEXT_PUBLIC_QIE_NETWORK ||
    process.env.NEXT_PUBLIC_ALGORAND_NETWORK ||
    "mainnet"
  ).toLowerCase();
  return n === "testnet" ? "testnet" : "mainnet";
}

function explorerBase(net: QieNetwork = qieNetwork()) {
  return net === "mainnet"
    ? "https://mainnet.qie.digital"
    : "https://testnet.qie.digital";
}

export function explorerAccountUrl(address: string, net?: QieNetwork): string {
  return `${explorerBase(net)}/address/${encodeURIComponent(address)}`;
}

export function explorerTxUrl(txId: string, net?: QieNetwork): string {
  return `${explorerBase(net)}/tx/${encodeURIComponent(txId)}`;
}

export function explorerAssetUrl(assetId: string, net?: QieNetwork): string {
  if (assetId === "0") return explorerBase(net);
  return `${explorerBase(net)}/token/${encodeURIComponent(assetId)}`;
}

// Back-compat aliases
export type AlgoNetwork = QieNetwork;
export const algoNetwork = qieNetwork;
