import type { PoolClient } from "pg";
import { getPool } from "./db.js";
import type { FlyerItem, FlyerSourceName } from "./types.js";

export function cacheKey(query: string, parts: Record<string, unknown>): string {
  return JSON.stringify({ query: query.trim().toLowerCase(), ...parts });
}

export async function getCachedItems(source: FlyerSourceName, key: string): Promise<FlyerItem[] | null> {
  const result = await getPool().query<{ payload: FlyerItem[] }>(
    "select payload from source_cache where source = $1 and cache_key = $2 and expires_at > now()",
    [source, key]
  );
  return result.rows[0]?.payload ?? null;
}

export async function setCachedItems(
  source: FlyerSourceName,
  key: string,
  items: FlyerItem[],
  ttlSeconds: number
): Promise<void> {
  await getPool().query(
    `insert into source_cache(source, cache_key, payload, expires_at)
     values ($1, $2, $3, now() + ($4 || ' seconds')::interval)
     on conflict(source, cache_key)
     do update set payload = excluded.payload, expires_at = excluded.expires_at, updated_at = now()`,
    [source, key, JSON.stringify(items), ttlSeconds]
  );
}

export async function purgeExpiredCache(client: PoolClient): Promise<number> {
  const result = await client.query("delete from source_cache where expires_at <= now()");
  return result.rowCount ?? 0;
}
