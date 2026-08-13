export type Envelope<T> = {
  data: T;
  meta: { chain: string; generated_at: string; cache: string };
};

/**
 * Fetch via Next.js proxy so INTERNAL_API_KEY never ships to the browser.
 * Client calls: /api/proxy/stats → backend /internal/stats
 */
export async function internalFetch<T>(path: string): Promise<T> {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  const res = await fetch(`/api/proxy/${clean}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} /internal/${clean}: ${body.slice(0, 240)}`);
  }
  const json = (await res.json()) as Envelope<T>;
  return json.data;
}
