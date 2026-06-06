import { cacheKey, getCachedItems, setCachedItems } from "../cache.js";
import { parsePriceText } from "../priceParser.js";
import type { FlyerItem, FlyerSource, SearchContext, SearchOptions } from "../types.js";

type Promotion = {
  id?: string | number;
  title?: string;
  name?: string;
  price?: string;
  salePrice?: string;
  regularPrice?: string;
  startDate?: string;
  endDate?: string;
  image?: string | { url?: string };
  url?: string;
};

export class WholeFoodsSource implements FlyerSource {
  name = "wholefoods" as const;
  ttlSeconds = 60 * 60 * 12;

  async search(query: string, ctx: SearchContext, options: SearchOptions = {}): Promise<FlyerItem[]> {
    const storeIds = ctx.storeIds.wholefoods ?? ["10244"];
    const key = cacheKey(query, { storeIds });
    const cached = await getCachedItems(this.name, key);
    if (cached || options.cacheOnly) {
      return cached ?? [];
    }

    const collected: FlyerItem[] = [];
    for (const storeId of storeIds) {
      const res = await fetch(`https://www.wholefoodsmarket.com/sales-flyer?store-id=${encodeURIComponent(storeId)}`, {
        headers: { "User-Agent": "flyer-watch/0.1" },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) {
        throw new Error(`Whole Foods flyer failed for ${storeId}: ${res.status}`);
      }
      const html = await res.text();
      const json = extractNextData(html);
      const promotions = findPromotions(json);
      for (const promo of promotions) {
        const name = promo.title ?? promo.name ?? "";
        if (!name.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        const parsed = parsePriceText([promo.salePrice, promo.price, promo.regularPrice].filter(Boolean).join(" "));
        collected.push({
          source: this.name,
          source_item_id: String(promo.id ?? `${storeId}:${name}:${promo.endDate}`),
          store: `Whole Foods ${storeId}`,
          name,
          price: parsed.price,
          quantity: parsed.quantity,
          original_price: parsed.original_price,
          valid_from: promo.startDate ?? null,
          valid_to: promo.endDate ?? null,
          image_url: typeof promo.image === "string" ? promo.image : promo.image?.url ?? null,
          url: promo.url ? new URL(promo.url, "https://www.wholefoodsmarket.com").toString() : null
        });
      }
    }
    const deduped = dedupeItems(collected);
    await setCachedItems(this.name, key, deduped, this.ttlSeconds);
    return deduped;
  }
}

function extractNextData(html: string): unknown {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Whole Foods __NEXT_DATA__ script not found");
  }
  return JSON.parse(match[1]!);
}

function findPromotions(root: unknown): Promotion[] {
  const promotions: Promotion[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") {
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.promotions)) {
      promotions.push(...(record.promotions as Promotion[]));
      return;
    }
    for (const child of Object.values(record)) visit(child);
  };
  visit(root);
  return promotions;
}

function dedupeItems(items: FlyerItem[]): FlyerItem[] {
  const byId = new Map<string, FlyerItem>();
  for (const item of items) {
    byId.set(item.source_item_id, item);
  }
  return [...byId.values()];
}
