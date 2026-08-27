import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

// A real SQLite file and real migrations. The race this covers lives in the
// database's unique constraint, so a mocked client would only prove the mock
// works.
const dbFile = join(mkdtempSync(join(tmpdir(), "golf-import-")), "test.db");
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.SINGLE_USER = "true";
execFileSync("npx", ["prisma", "migrate", "deploy"], { env: process.env, stdio: "pipe" });

// Imported after DATABASE_URL is set — the client is constructed at import.
const { prisma } = await import("@/lib/db");
const { POST } = await import("@/app/api/import/confirm/route");

const csv = readFileSync(join(__dirname, "fixtures/rapsodo-mlm2pro.csv"), "utf8");

function confirmRequest() {
  const form = new FormData();
  form.set("file", new File([csv], "rapsodo-mlm2pro.csv", { type: "text/csv" }));
  form.set("minutes", "45");
  form.set("excluded", "[]");
  return new Request("http://localhost/api/import/confirm", { method: "POST", body: form });
}

test("two confirms in flight at once report a duplicate, not a broken file", async () => {
  // currentUserId() has its own read-then-write race (issue #9); seeding the
  // row keeps this test pointed at the import race it is here to prove.
  await prisma.user.create({ data: { id: "single", name: "You" } });

  const responses = await Promise.all([POST(confirmRequest()), POST(confirmRequest())]);
  const bodies = await Promise.all(responses.map((r) => r.json()));

  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(bodies.filter((b) => b.duplicate === false)).toHaveLength(1);
  expect(bodies.filter((b) => b.duplicate === true)).toHaveLength(1);

  const dup = bodies.find((b) => b.duplicate === true);
  expect(dup.batchId).toBeTruthy();
  expect(dup.sessionId).toBeTruthy();

  // The guard's whole point: one batch, one session.
  expect(await prisma.importBatch.count()).toBe(1);
  expect(await prisma.practiceSession.count()).toBe(1);
});
