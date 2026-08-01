/**
 * Algorand ASA logos via Tinyman ASA List.
 * @see https://asa-list.tinyman.org/
 * URL: https://asa-list.tinyman.org/assets/{asset_id}/icon.png
 */

export function tokenLogoUrl(assetId: string | number | null | undefined): string | null {
  if (assetId == null || assetId === "") return null;
  const id = String(assetId).trim();
  // Native ALGO is asset 0 — Tinyman hosts it
  if (!/^\d+$/.test(id)) return null;
  return `https://asa-list.tinyman.org/assets/${id}/icon.png`;
}

export function tokenLogoUrlSvg(assetId: string | number | null | undefined): string | null {
  if (assetId == null || assetId === "") return null;
  const id = String(assetId).trim();
  if (!/^\d+$/.test(id)) return null;
  return `https://asa-list.tinyman.org/assets/${id}/icon.svg`;
}
