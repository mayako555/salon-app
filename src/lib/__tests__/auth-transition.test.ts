import test from "node:test";
import assert from "node:assert/strict";
import { createSessionQueue, isPublicAuthPath, storeSelectionKey } from "../auth-transition";

test("delayed old login cannot overwrite logout or the new salon session", async () => {
  const queue = createSessionQueue();
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  const writes: string[] = [];
  const first = queue.run(async () => { await paused; writes.push("Jasmine"); });
  const logout = queue.run(async () => { writes.push("deleted"); });
  const second = queue.run(async () => { writes.push("Lefite"); });
  await Promise.resolve();
  assert.deepEqual(writes, []);
  release();
  await Promise.all([first, logout, second]);
  assert.deepEqual(writes, ["Jasmine", "deleted", "Lefite"]);
});

test("failed session creation rejects its caller but permits later logout/login", async () => {
  const queue = createSessionQueue();
  await assert.rejects(queue.run(async () => { throw new Error("offline"); }), /offline/);
  assert.equal(await queue.run(async () => "new session"), "new session");
});

test("store preference is isolated by both user and tenant, including impersonation", () => {
  assert.notEqual(storeSelectionKey("owner", "Jasmine"), storeSelectionKey("owner", "Lefite"));
  assert.notEqual(storeSelectionKey("owner", "Lefite"), storeSelectionKey("staff", "Lefite"));
  assert.notEqual(storeSelectionKey("a:b", "c"), storeSelectionKey("a", "b:c"));
});

test("private sales and staff pages stay behind authentication; LINE remains public", () => {
  for (const path of ["/dashboard", "/analytics", "/staff-portal", "/sales", "/link-line-admin"]) {
    assert.equal(isPublicAuthPath(path), false, path);
  }
  for (const path of ["/login", "/staff/login", "/link-line", "/link-line/customer", "/privacy", "/entry", "/lp"]) {
    assert.equal(isPublicAuthPath(path), true, path);
  }
});

test("an old salon lookup arriving after a new login cannot commit", async () => {
  const { createAuthRevision } = await import("../auth-transition");
  const revisions = createAuthRevision();
  const first = revisions.next();
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let displayed = "";
  const oldLookup = delayed.then(() => {
    if (revisions.isCurrent(first)) displayed = "Jasmine";
  });
  const second = revisions.next();
  if (revisions.isCurrent(second)) displayed = "Lefite";
  release();
  await oldLookup;
  assert.equal(displayed, "Lefite");
  revisions.next(); // Logout or provider disposal also invalidates pending work.
  assert.equal(revisions.isCurrent(second), false);
});
