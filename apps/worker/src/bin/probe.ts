import { createSources, type SearchContext } from "@flyer-watch/core";

const [, , sourceName, query] = process.argv;
if (!sourceName || !query) {
  console.error("Usage: pnpm --filter @flyer-watch/worker probe <source> <query>");
  process.exit(1);
}

const source = createSources().find((candidate) => candidate.name === sourceName);
if (!source) {
  console.error(`Unknown source: ${sourceName}`);
  process.exit(1);
}

const ctx: SearchContext = {
  postalCode: process.env.POSTAL_CODE ?? "V6B 1A1",
  storeIds: {
    wholefoods: [process.env.WHOLEFOODS_STORE_ID ?? "10244"],
    sungiven: [process.env.SUNGIVEN_STORE_ID ?? "vancouver"]
  }
};

const rows = await source.search(query, ctx, { cacheOnly: process.env.CACHE_ONLY === "1" });
console.log(JSON.stringify(rows, null, 2));
