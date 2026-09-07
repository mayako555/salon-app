export type UserRole =
  | "systemOwner"
  | "companyOwner"
  | "manager"
  | "storeManager"
  | "staff"
  | "admin"
  | "accountant"
  | "guest";

export interface UserContext {
  uid: string;
  profileId?: string;
  role: UserRole;
  companyId?: string;
  salonIds: string[];
  schoolEnabled?: boolean;
  schoolName?: string;
  isImpersonating?: boolean;
  originalSystemOwnerUid?: string;
}

type TenantDocument = {
  companyId?: unknown;
  tenant_id?: unknown;
};

export function isUnscopedSystemOwner(ctx: UserContext): boolean {
  return ctx.role === "systemOwner" && !ctx.isImpersonating;
}

export function requireCompanyId(ctx: UserContext): string {
  if (!ctx.companyId) {
    throw new Error("Unauthorized: Company ID is missing in context");
  }
  return ctx.companyId;
}

export function assertDocumentTenant(ctx: UserContext, data: TenantDocument): void {
  if (isUnscopedSystemOwner(ctx)) return;

  const companyId = requireCompanyId(ctx);
  if (data.companyId !== companyId && data.tenant_id !== companyId) {
    throw new Error("Unauthorized tenant access: Document belongs to a different tenant");
  }
}

export function withTenantCompanyId<T extends Record<string, unknown>>(
  ctx: UserContext,
  data: T,
): T & { companyId?: string } {
  if (isUnscopedSystemOwner(ctx)) return { ...data };
  return { ...data, companyId: requireCompanyId(ctx) };
}

export function verifyPermission(
  ctx: UserContext,
  targetCompanyId?: string,
  targetUserId?: string,
): true {
  if (isUnscopedSystemOwner(ctx)) return true;

  if (targetCompanyId && targetCompanyId !== ctx.companyId) {
    throw new Error("権限がありません");
  }

  if (ctx.role === "staff" && targetUserId && targetUserId !== ctx.uid) {
    throw new Error("権限がありません");
  }

  return true;
}
