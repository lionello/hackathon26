import { cacheKey, getCachedItems, setCachedItems } from "../cache.js";
import { parsePriceText } from "../priceParser.js";
import type { FlyerItem, FlyerSource, SearchContext, SearchOptions } from "../types.js";

const endpoint = "https://backflipp.wishabi.com/flipp/items/search";
const flippStoreNames = ["loblaws", "no frills", "metro", "sobeys", "walmart"];

type FlippItem = {
  id?: string | number;
  name?: string;
  merchant?: string;
  merchant_name?: string;
  current_price?: string;
  pre_price_text?: string;
  post_price_text?: string;
  sale_story?: string;
  valid_from?: string;
  valid_to?: string;
  image_url?: string;
  url?: string;
  flyer_item_url?: string;
};

export class FlippSource implements FlyerSource {
  name = "flipp" as const;
  ttlSeconds = 60 * 60 * 6;

  async search(query: string, ctx: SearchContext, options: SearchOptions = {}): Promise<FlyerItem[]> {
    const key = cacheKey(query, { postalCode: ctx.postalCode });
    const cached = await getCachedItems(this.name, key);
    if (cached || options.cacheOnly) {
      return cached ?? [];
    }

    const params = new URLSearchParams({
      locale: "en-ca",
      postal_code: ctx.postalCode,
      q: query
    });
    const res = await fetch(`${endpoint}?${params}`, {
      headers: { "User-Agent": "flyer-watch/0.1" },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      throw new Error(`Flipp search failed: ${res.status}`);
    }
    const data = (await res.json()) as { items?: FlippItem[] };
    const items = (data.items ?? [])
      .map((item): FlyerItem => {
        const store = item.merchant_name ?? item.merchant ?? "Flipp";
        const priceText = [item.pre_price_text, item.current_price, item.post_price_text, item.sale_story].filter(Boolean).join(" ");
        const parsed = parsePriceText(priceText);
        return {
          source: this.name,
          source_item_id: String(item.id ?? `${store}:${item.name}:${item.valid_to}`),
          store,
          name: item.name ?? "Unknown item",
          price: parsed.price,
          quantity: parsed.quantity,
          original_price: parsed.original_price,
          valid_from: item.valid_from ?? null,
          valid_to: item.valid_to ?? null,
          image_url: item.image_url ?? null,
          url: item.flyer_item_url ?? item.url ?? null
        };
      })
      .filter((item) => flippStoreNames.some((store) => item.store.toLowerCase().includes(store)));

    await setCachedItems(this.name, key, items, this.ttlSeconds);
    return items;
  }
}
