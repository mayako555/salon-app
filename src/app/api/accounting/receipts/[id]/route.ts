import { scope } from '@/lib/accounting/service';
import { validId } from '@/lib/accounting/model';
export async function GET(_request: Request, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const s = await scope();
        const { id } = await context.params;
        const d = (await s.root.collection('expense_receipts').doc(validId(id)).get()).data();
        if (!d || d.companyId !== s.tenant)
            return new Response(null, { status: 404 });
        return new Response(Buffer.from(d.data, 'base64'), { headers: { 'Content-Type': d.mime, 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff' } });
    }
    catch {
        return new Response(null, { status: 403 });
    }
}
