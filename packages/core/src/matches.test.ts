import assert from "node:assert/strict";
import test from "node:test";
import { queryVariants } from "./matches.js";

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
