import { FlippSource } from "./flipp.js";
import { SungivenSource } from "./sungiven.js";
import { WholeFoodsSource } from "./wholeFoods.js";
import type { FlyerSource } from "../types.js";

export function createSources(): FlyerSource[] {
  return [new FlippSource(), new WholeFoodsSource(), new SungivenSource()];
}
