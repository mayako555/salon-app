export const JASMINE_LASH_COMPANY_ID = "company_default";

export function shouldApplyJasmineShiftPolicy(
  companyId?: string,
  linkWithShifts?: boolean
): boolean {
  if (companyId !== JASMINE_LASH_COMPANY_ID) return false;
  return linkWithShifts !== false;
}
