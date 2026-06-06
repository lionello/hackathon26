import assert from "node:assert/strict";
import test from "node:test";
import { parsePriceText } from "@flyer-watch/core";

test("price parser captures multi-buy quantity but leaves multipack text to name extraction", () => {
  assert.deepEqual(parsePriceText("PKG OF 3 strawberries 2 for $5"), {
    price: 5,
    quantity: 2,
    original_price: null
  });
});
