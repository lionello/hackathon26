import assert from "node:assert/strict";
import test from "node:test";
import { summarizeUserJobStatus } from "./jobs.js";

test("summarizeUserJobStatus ignores stale failures after a newer success", () => {
  const status = summarizeUserJobStatus([
    { status: "done", last_error: null, updated_at: new Date("2026-06-06T12:00:00Z") },
    { status: "failed", last_error: "fetch failed", updated_at: new Date("2026-06-06T11:00:00Z") }
  ]);

  assert.deepEqual(status, { pending: false, lastError: null });
});

test("summarizeUserJobStatus reports latest unresolved failure", () => {
  const failedAt = new Date("2026-06-06T12:00:00Z");
  const status = summarizeUserJobStatus([
    { status: "failed", last_error: "fetch failed", updated_at: failedAt },
    { status: "done", last_error: null, updated_at: new Date("2026-06-06T11:00:00Z") }
  ]);

  assert.deepEqual(status, {
    pending: false,
    lastError: { message: "fetch failed", at: failedAt }
  });
});

test("summarizeUserJobStatus reports pending separately from failures", () => {
  const failedAt = new Date("2026-06-06T12:00:00Z");
  const status = summarizeUserJobStatus([
    { status: "pending", last_error: null, updated_at: new Date("2026-06-06T12:05:00Z") },
    { status: "failed", last_error: "fetch failed", updated_at: failedAt }
  ]);

  assert.deepEqual(status, {
    pending: true,
    lastError: { message: "fetch failed", at: failedAt }
  });
});
