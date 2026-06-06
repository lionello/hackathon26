import { extractFlyerJsonFromImage } from "@flyer-watch/core";

const [, , imageUrl, ...rest] = process.argv;
if (!imageUrl) {
  console.error("Usage: pnpm --filter @flyer-watch/worker probe:vision <imageUrl> --grep <term>");
  process.exit(1);
}

const grepIndex = rest.indexOf("--grep");
const grep = grepIndex >= 0 ? rest[grepIndex + 1]?.toLowerCase() : undefined;
const extracted = await extractFlyerJsonFromImage(imageUrl);
if (!grep) {
  console.log(JSON.stringify(extracted, null, 2));
} else {
  console.log(JSON.stringify(filterByTerm(extracted, grep), null, 2));
}

function filterByTerm(value: unknown, term: string): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as { items?: Array<{ name?: string }> };
  if (!Array.isArray(record.items)) return value;
  return { ...record, items: record.items.filter((item) => item.name?.toLowerCase().includes(term)) };
}
