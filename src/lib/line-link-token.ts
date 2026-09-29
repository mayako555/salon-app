import { createHmac, timingSafeEqual } from "node:crypto";
export type LineLinkPayload = { companyId: string; customerId: string; storeName: string; nonce: string; expiresAt: number };
export function signLineLink(payload: LineLinkPayload, secret: string) {
  if (!secret) throw new Error("Missing signing key");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + createHmac("sha256", secret).update(body).digest("base64url");
}
export function readLineLink(token: string): LineLinkPayload {
  if (typeof token !== "string" || token.length > 4096 || token.split(".").length !== 2) throw new Error("Invalid link");
  const p = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
  for (const key of ["companyId", "customerId", "storeName", "nonce"]) if (typeof p[key] !== "string" || !p[key] || p[key].length > 256) throw new Error("Invalid link");
  if (p.companyId.includes("/") || p.customerId.includes("/") || !Number.isFinite(p.expiresAt)) throw new Error("Invalid link");
  return p;
}
export function verifyLineLink(token: string, secret: string, now = Date.now()): LineLinkPayload {
  const payload = readLineLink(token);
  const expected = signLineLink(payload, secret);
  if (expected.length !== token.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(token)) || payload.expiresAt <= now) throw new Error("Invalid or expired link");
  return payload;
}
export function assertLinkCustomer(payload: LineLinkPayload, customer: Record<string, unknown>) {
  if (customer.companyId !== payload.companyId || customer.line_link_nonce !== payload.nonce || (customer.store_name && customer.store_name !== payload.storeName)) throw new Error("Invalid customer link");
}
