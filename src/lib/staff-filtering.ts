export function filterStaffByCompany<T extends { companyId?: string }>(
  staff: readonly T[],
  companyId: string
): T[] {
  return staff.filter((member) => member.companyId === companyId);
}
