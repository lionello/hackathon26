import { cacheKey, getCachedItems, setCachedItems } from "../cache.js";
import { parsePriceText } from "../priceParser.js";
import type { FlyerItem, FlyerSource, SearchContext, SearchOptions } from "../types.js";
import { extractFlyerJsonFromImage } from "../vision/client.js";

type VisionItem = {
  name?: string;
  price_text?: string;
  valid_from?: string;
  valid_to?: string;
  image_url?: string;
  url?: string;
};

export class SungivenSource implements FlyerSource {
  name = "sungiven" as const;
  ttlSeconds = 60 * 60 * 24;

  async search(query: string, ctx: SearchContext, options: SearchOptions = {}): Promise<FlyerItem[]> {
    const storeIds = ctx.storeIds.sungiven ?? ["vancouver"];
    const key = cacheKey(query, { storeIds });
    const cached = await getCachedItems(this.name, key);
    if (cached || options.cacheOnly) {
      return cached ?? [];
    }

    const imageUrls = await getFlyerImageUrls();
    const items: FlyerItem[] = [];
    for (const imageUrl of imageUrls) {
      const extracted = (await extractFlyerJsonFromImage(imageUrl)) as { items?: VisionItem[] };
      for (const item of extracted.items ?? []) {
        const name = item.name ?? "";
        if (!name.toLowerCase().includes(query.toLowerCase())) {
          continue;
        }
        const parsed = parsePriceText(item.price_text);
        items.push({
          source: this.name,
          source_item_id: `${imageUrl}:${name}:${item.valid_to ?? ""}`,
          store: "Sungiven Vancouver",
          name,
          price: parsed.price,
          quantity: parsed.quantity,
          original_price: parsed.original_price,
          valid_from: item.valid_from ?? null,
          valid_to: item.valid_to ?? null,
          image_url: item.image_url ?? imageUrl,
          url: item.url ?? imageUrl
        });
      }
    }

    await setCachedItems(this.name, key, items, this.ttlSeconds);
    return items;
  }
}

export async function getFlyerImageUrls(): Promise<string[]> {
  const res = await fetch("https://www.sungivenfoods.ca/flyer", {
    headers: { "User-Agent": "flyer-watch/0.1" },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) {
    throw new Error(`Sungiven flyer page failed: ${res.status}`);
  }
  const html = await res.text();
  return [...html.matchAll(/https?:\/\/[^"'<> ]+\.jpe?g(?:\?[^"'<> ]*)?/gi)].map((match) => match[0]);
}
