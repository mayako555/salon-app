import { NextResponse } from 'next/server';
import { finishOAuth } from '@/lib/accounting/service';
import { freeeConfig } from '@/lib/accounting/providers';
export const runtime = 'nodejs';
export async function GET(request: Request) {
    const url = new URL(request.url);
    let success = false;
    try {
        if (!url.searchParams.has('error')) {
            await finishOAuth(url.searchParams.get('state') || '', url.searchParams.get('code') || '');
            success = true;
        }
    }
    catch { /* Never log authorization codes, tokens or raw provider errors. */ }
    let origin: string;
    try {
        origin = freeeConfig().origin;
    }
    catch {
        return new Response('会計連携の設定を確認してください。', { status: 503 });
    }
    const response = NextResponse.redirect(origin + '/admin/settings/integrations/accounting?oauth=' + (success ? 'success' : 'error'));
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
}
