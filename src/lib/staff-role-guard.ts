export type ProtectedStaffRole =
  | "systemOwner"
  | "companyOwner"
  | "manager"
  | "storeManager"
  | "staff"
  | "admin"
  | "accountant";

/**
 * systemOwner is a platform-level identity and cannot be downgraded from the
 * tenant staff editor. Recovery/elevation must use an explicit admin path.
 */
export function validateStaffRoleChange(
  currentRole: ProtectedStaffRole,
  requestedRole: ProtectedStaffRole,
): void {
  if (currentRole === "systemOwner" && requestedRole !== "systemOwner") {
    throw new Error("システムオーナーの権限はスタッフ管理画面から変更できません");
  }
}
