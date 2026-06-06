import { createSources } from "./sources/index.js";
import type { DealMatch, SearchContext, SearchOptions, WatchItem } from "./types.js";

const sources = createSources();

export async function findMatches(watchItems: WatchItem[], ctx: SearchContext, options: SearchOptions): Promise<DealMatch[]> {
  const matches: DealMatch[] = [];
  for (const watchItem of watchItems) {
    for (const source of sources) {
      const items = await source.search(watchItem.query, ctx, options);
      for (const item of items) {
        if (item.price === null) {
          continue;
        }
        matches.push({ watchItem, item });
      }
    }
  }
  return matches;
}
