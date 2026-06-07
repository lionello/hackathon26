import { createSources } from "./sources/index.js";
import type { DealMatch, FlyerSource, SearchContext, SearchOptions, WatchItem } from "./types.js";

const sources = createSources();

export async function findMatches(
  watchItems: WatchItem[],
  ctx: SearchContext,
  options: SearchOptions,
  activeSources: FlyerSource[] = sources
): Promise<DealMatch[]> {
  const matches: DealMatch[] = [];
  const seen = new Set<string>();
  for (const watchItem of watchItems) {
    for (const source of activeSources) {
      for (const query of queryVariants(watchItem.query)) {
        const items = await searchSource(source, query, ctx, options);
        for (const item of items) {
          if (item.price === null) {
            continue;
          }
          const matchKey = `${watchItem.id}:${item.source}:${item.source_item_id}`;
          if (seen.has(matchKey)) {
            continue;
          }
          seen.add(matchKey);
          matches.push({ watchItem, item });
        }
      }
    }
  }
  return matches;
}

async function searchSource(
  source: FlyerSource,
  query: string,
  ctx: SearchContext,
  options: SearchOptions
) {
  try {
    return await source.search(query, ctx, options);
  } catch (error) {
    console.warn("flyer source search failed", {
      source: source.name,
      query,
      error: errorMessage(error)
    });
    return [];
  }
}

export function queryVariants(query: string): string[] {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return [];
  }
  const singular = singularizeLastWord(normalized);
  return singular === normalized ? [normalized] : [normalized, singular];
}

function singularizeLastWord(query: string): string {
  const parts = query.split(" ");
  const last = parts.at(-1);
  if (!last) {
    return query;
  }
  const singular = singularizeWord(last);
  return singular === last ? query : [...parts.slice(0, -1), singular].join(" ");
}

function singularizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (word.length <= 3 || lower.endsWith("ss") || lower.endsWith("us") || lower.endsWith("is")) {
    return word;
  }
  if (lower.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }
  if (lower.endsWith("oes")) {
    return word.slice(0, -2);
  }
  if (/(ches|shes|xes|zes|ses)$/i.test(word)) {
    return word.slice(0, -2);
  }
  if (lower.endsWith("s")) {
    return word.slice(0, -1);
  }
  return word;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
