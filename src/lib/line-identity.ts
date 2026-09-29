/** Validate the LINE credential on the server; never trust a browser user ID. */
export async function verifyLineIdentity(accessToken: string, liffId: string, request: typeof fetch = fetch): Promise<string> {
  if (!/^\d+-[A-Za-z0-9]+$/.test(liffId) || !accessToken || accessToken.length > 4096) throw new Error("LINE authentication failed");
  const verified = await request(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!verified.ok) throw new Error("LINE authentication failed");
  const validity = await verified.json();
  if (String(validity.client_id) !== liffId.split("-")[0] || !(validity.expires_in > 0)) throw new Error("LINE authentication failed");
  const response = await request("https://api.line.me/v2/profile", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("LINE authentication failed");
  const profile = await response.json();
  if (typeof profile.userId !== "string" || !/^U[a-f0-9]{32}$/.test(profile.userId)) throw new Error("LINE authentication failed");
  return profile.userId;
}
