import { writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { extractFlyerJsonFromImage } from "@flyer-watch/core";

const imageUrl = process.argv[2];
if (!imageUrl) {
  console.error("Usage: pnpm --filter @flyer-watch/worker generate:sungiven-golden <imageUrl>");
  process.exit(1);
}

const extracted = await extractFlyerJsonFromImage(imageUrl);
const filename = basename(new URL(imageUrl).pathname).replace(/\.(jpe?g|png)$/i, ".golden.json");
const output = resolve(process.cwd(), "apps/worker/src/sungiven", filename);
await writeFile(output, `${JSON.stringify(extracted, null, 2)}\n`, "utf8");
console.log(output);
