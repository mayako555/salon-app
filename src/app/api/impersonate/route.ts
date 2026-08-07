import { NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { addAuditLog } from '@/app/audit/actions';

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentUserContext();
    
    // Only systemOwner can impersonate
    if (ctx.role !== "systemOwner") {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Verify company exists
    const companySnap = await adminDb.collection("companies").doc(companyId).get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Set cookie
    const response = NextResponse.json({ success: true });
    
    // Cookie valid for 24 hours
    response.cookies.set({
      name: 'impersonated_company_id',
      value: companyId,
      httpOnly: false, // Need to read from client auth-context
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    });

    // Write audit log
    await addAuditLog({
      table_name: 'impersonation',
      record_id: companyId,
      action: 'SYSTEM',
      old_data: null,
      new_data: { impersonated_company_id: companyId, original_system_owner_uid: ctx.uid },
      actor: ctx.uid
    });

    return response;
  } catch (error: any) {
    console.error('Impersonate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
