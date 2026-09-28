"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";
import { completeCustomerLineLink, getCustomerLineLinkInfo } from "./actions";

export default function LineLinkClient() {
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<{ storeName: string; lineOaId: string } | null>(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const params = new URLSearchParams(window.location.search);
        const state = params.get("liff.state");
        const nested = state ? new URL(state, window.location.origin).searchParams : null;
        const linkToken = params.get("token") || nested?.get("token") || "";
        const result = await getCustomerLineLinkInfo(linkToken);
        if (!result.success) throw new Error(result.error);
        await liff.init({ liffId: result.liffId });
        if (cancelled) return;
        setToken(linkToken); setInfo(result); setStatus("ready");
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : "連携ページを開けませんでした"); setStatus("error"); }
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);
  async function link() {
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return; }
    setStatus("linking");
    try {
      const result = await completeCustomerLineLink(token, liff.getAccessToken() || "");
      if (!result.success) throw new Error(result.error);
      setStatus("success");
    } catch (e) { setError(e instanceof Error ? e.message : "連携に失敗しました"); setStatus("error"); }
  }
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><section className="max-w-md w-full rounded-3xl bg-white shadow-xl p-8 space-y-6 text-center">
    <h1 className="text-2xl font-bold">LINEアカウント連携</h1>
    {info && <p>{info.storeName}のカルテとLINEを連携します。</p>}
    {(status === "loading" || status === "linking") && <p role="status">{status === "loading" ? "準備中…" : "連携中…"}</p>}
    {status === "ready" && <><p className="text-sm text-slate-600">ご本人のLINEでログインして、連携してください。</p><button className="w-full rounded-xl bg-green-600 text-white p-4 font-bold" onClick={link}>LINEでログインして連携</button></>}
    {status === "success" && <><p className="text-green-700 font-bold" role="status">LINE連携が完了しました</p><p className="text-sm">メッセージを受け取るには、店舗の公式アカウントを友だち追加してください。</p>{info && <a className="block rounded-xl bg-green-600 text-white p-4" href={`https://line.me/R/ti/p/${encodeURIComponent(info.lineOaId)}`}>友だち追加</a>}</>}
    {status === "error" && <p role="alert" className="text-red-700">{error}</p>}
  </section></main>;
}
