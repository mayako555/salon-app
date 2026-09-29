import assert from "node:assert/strict";
import test from "node:test";
import { signLineLink, verifyLineLink, assertLinkCustomer } from "../line-link-token";
import { verifyLineIdentity } from "../line-identity";
import { publicLineSettings, lineSettingsPatch, isLineStoreSettingsComplete } from "../line-integration-settings";
const payload = { companyId: "tenant-a", customerId: "customer-a", storeName: "store-a", nonce: "nonce-a", expiresAt: 2000 };

test("QR: correct key accepted, other store key and modified customer rejected", () => {
  const token = signLineLink(payload, "secret-a");
  assert.deepEqual(verifyLineLink(token, "secret-a", 1000), payload);
  assert.throws(() => verifyLineLink(token, "secret-b", 1000));
  const changed = Buffer.from(JSON.stringify({ ...payload, customerId: "victim" })).toString("base64url") + "." + token.split(".")[1];
  assert.throws(() => verifyLineLink(changed, "secret-a", 1000));
});
test("QR: expiry, malformed payload and missing key rejected", () => {
  assert.throws(() => verifyLineLink(signLineLink(payload, "key"), "key", 2000));
  assert.throws(() => verifyLineLink("garbage", "key", 1000));
  assert.throws(() => signLineLink(payload, ""));
});
test("QR: tenant, store, superseded and consumed nonces rejected", () => {
  const customer = { companyId: "tenant-a", store_name: "store-a", line_link_nonce: "nonce-a" };
  assert.doesNotThrow(() => assertLinkCustomer(payload, customer));
  for (const changed of [{companyId:"tenant-b"}, {store_name:"store-b"}, {line_link_nonce:null}, {line_link_nonce:"new-nonce"}]) assert.throws(() => assertLinkCustomer(payload, { ...customer, ...changed }));
});
test("Settings: every completion state hides credential and preserves blank token updates", () => {
  for (const value of [{}, {lineOaId:"@a"}, {lineOaId:"@a",channelAccessToken:"secret"}, {lineOaId:"@a",channelAccessToken:"secret",liffId:"123-app"}]) {
    const safe = publicLineSettings(value);
    assert.equal(safe.channelAccessToken, "");
    assert.equal(JSON.stringify(safe).includes("secret"), false);
    assert.equal(isLineStoreSettingsComplete(safe), Boolean(value.lineOaId && value.channelAccessToken && value.liffId));
  }
  assert.deepEqual(lineSettingsPatch({ lineOaId: " @a ", channelAccessToken: " " }), {lineOaId:"@a",liffId:""});
  assert.equal(lineSettingsPatch({channelAccessToken:" new "}).channelAccessToken, "new");
});
test("LINE: profile accepted only after correct channel and unexpired token", async () => {
  const userId = "U" + "a".repeat(32);
  let calls = 0;
  const request = (async () => Response.json(++calls === 1 ? {client_id:"123",expires_in:600} : {userId})) as typeof fetch;
  assert.equal(await verifyLineIdentity("credential", "123-app", request), userId);
  assert.equal(calls, 2);
});
test("LINE: wrong channel and expired tokens cannot fetch or link profile", async () => {
  for (const validity of [{client_id:"other",expires_in:600}, {client_id:"123",expires_in:0}]) {
    let calls=0;
    const request = (async () => { calls++; return Response.json(validity); }) as typeof fetch;
    await assert.rejects(verifyLineIdentity("credential", "123-app", request));
    assert.equal(calls, 1);
  }
});
test("LINE: HTTP errors and malformed user identities fail closed", async () => {
  await assert.rejects(verifyLineIdentity("credential", "123-app", (async () => new Response("private error", {status:401})) as typeof fetch), /LINE authentication failed/);
  let calls=0;
  await assert.rejects(verifyLineIdentity("credential", "123-app", (async () => Response.json(++calls === 1 ? {client_id:"123",expires_in:600} : {userId:"forged"})) as typeof fetch));
});
