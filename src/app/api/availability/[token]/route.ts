import { readPublicAvailability } from '@/lib/availability/service';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const offset = new URL(request.url).searchParams.get('offset') || '0';
  if (!['0','7'].includes(offset)) return Response.json({ error: '日付を確認してください。' }, {status:400,headers});
  try {
    const data = await readPublicAvailability((await params).token, Number(offset), new URL(request.url).searchParams.get("menu") || undefined);
    return Response.json(data || {error:'この空き状況リンクは現在公開されていません。'}, {status:data ? 200 : 404,headers});
  } catch {
    return Response.json({ error: '空き状況を取得できませんでした。時間をおいて再度お試しください。' }, {status:503,headers});
  }
}
