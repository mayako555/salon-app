import { BookingError, createPublicBooking } from '@/lib/availability/booking';
export const runtime = 'nodejs';
const headers = {'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
export async function POST(request: Request, {params}: {params:Promise<{token:string}>}) {
  // Next's internal URL can use localhost behind a reverse proxy. Match the
  // browser Origin against the actual Host header, never a client-supplied tenant.
  const rawOrigin = request.headers.get('origin');
  let sameOrigin = false;
  try {
    const origin = new URL(rawOrigin || '');
    const local = ['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
    sameOrigin = origin.origin === rawOrigin && origin.host === request.headers.get('host') && (origin.protocol === 'https:' || (local && origin.protocol === 'http:'));
  } catch { /* Missing or invalid Origin is rejected. */ }
  if (!sameOrigin || !request.headers.get('content-type')?.startsWith('application/json')) return Response.json({error:'予約画面から送信してください。'},{status:403,headers});
  try {
    // Bound streamed bodies as well as Content-Length; never log contact details.
    if (!request.body) throw new BookingError(400,'入力内容を確認してください。');
    const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    while (true) {const {done,value} = await reader.read(); if(done) break; size += value.length; if(size > 4096) {await reader.cancel(); throw new BookingError(413,'入力内容が長すぎます。');} chunks.push(value);}
    let input; try {input = JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new BookingError(400,'入力内容を確認してください。');}
    const receipt = await createPublicBooking((await params).token,input);
    return Response.json({receipt},{status:201,headers});
  } catch (e) {
    return Response.json({error:e instanceof BookingError ? e.message : '予約結果を確認できませんでした。同じ内容で再送信してください。'}, {status:e instanceof BookingError ? e.status : 503,headers});
  }
}
