import assert from "node:assert/strict";
import test from "node:test";
import { findMatches, queryVariants } from "./matches.js";
import type { FlyerItem, FlyerSource, SearchContext, WatchItem } from "./types.js";

test("queryVariants searches plural and conservative singular forms", () => {
  assert.deepEqual(queryVariants("bananas"), ["bananas", "banana"]);
  assert.deepEqual(queryVariants("strawberries"), ["strawberries", "strawberry"]);
  assert.deepEqual(queryVariants("chicken breasts"), ["chicken breasts", "chicken breast"]);
  assert.deepEqual(queryVariants("tomatoes"), ["tomatoes", "tomato"]);
});

test("queryVariants leaves non-plural-looking queries alone", () => {
  assert.deepEqual(queryVariants("milk"), ["milk"]);
  assert.deepEqual(queryVariants("bass"), ["bass"]);
});

test("findMatches continues when one flyer source fails", async () => {
  const watchItems: WatchItem[] = [{ id: "watch-1", user_id: "user-1", query: "milk" }];
  const ctx: SearchContext = { postalCode: "V6B 1A1", storeIds: {} };
  const workingSource = fakeSource("flipp", [
    {
      source: "flipp",
      source_item_id: "flipp-1",
      store: "No Frills",
      name: "Milk",
      price: 4.99,
      quantity: null,
      original_price: null,
      valid_from: null,
      valid_to: null,
      image_url: null,
      url: null
    }
  ]);
  const failingSource = fakeSource("sungiven", [], new Error("vision failed"));

  const matches = await findMatches(watchItems, ctx, { cacheOnly: false }, [failingSource, workingSource]);

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.item.source, "flipp");
});

function fakeSource(name: FlyerSource["name"], items: FlyerItem[], error?: Error): FlyerSource {
  return {
    name,
    ttlSeconds: 60,
    async search() {
      if (error) {
        throw error;
      }
      return items;
    }
  };
}
