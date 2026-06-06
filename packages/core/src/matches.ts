import { discountPct } from "./priceParser.js";
import { createSources } from "./sources/index.js";
import type { DealMatch, SearchContext, SearchOptions, WatchItem } from "./types.js";

export async function findMatches(watchItems: WatchItem[], ctx: SearchContext, options: SearchOptions): Promise<DealMatch[]> {
  const sources = createSources();
  const matches: DealMatch[] = [];
  for (const watchItem of watchItems) {
    for (const source of sources) {
      const items = await source.search(watchItem.query, ctx, options);
      for (const item of items) {
        const pct = discountPct(item.price, item.original_price);
        if (pct !== null && pct < watchItem.min_discount_pct) {
          continue;
        }
        matches.push({ watchItem, item, discountPct: pct });
      }
    }
  }
  return matches;
}
