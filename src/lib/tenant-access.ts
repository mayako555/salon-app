import type { FeatureKey } from "@/types/master";

export type TenantStatus = "active" | "inactive";

export function normalizeTenantStatus(value: unknown): TenantStatus {
  return value === "inactive" ? "inactive" : "active";
}

export function isTenantActive(value: unknown): boolean {
  return normalizeTenantStatus(value) === "active";
}

const FEATURE_ROUTE_PREFIXES: ReadonlyArray<readonly [string, FeatureKey]> = [
  ["/admin/reviews/import", "sales"],
  ["/admin/sales/debug", "sales"],
  ["/staff-portal/reservations", "reservations"],
  ["/staff-portal/customers", "customers"],
  ["/staff-portal/transportation", "payroll"],
  ["/staff-portal/transport", "payroll"],
  ["/staff-portal/inventory", "inventory"],
  ["/staff-portal/expenses", "expenses"],
  ["/staff-portal/holidays", "shifts"],
  ["/staff-portal/payroll", "payroll"],
  ["/staff-portal/shifts", "shifts"],
  ["/staff-portal/goals", "goals"],
  ["/staff-portal/sales", "sales"],
  ["/admin/paid-leaves", "attendance"],
  ["/admin/cash-management", "cash_management"],
  ["/admin/expenses", "expenses"],
  ["/admin/funds", "cash_management"],
  ["/admin/goals", "goals"],
  ["/admin/school", "school"],
  ["/admin/tasks", "tasks"],
  ["/admin/import", "customers"],
  ["/reservations", "reservations"],
  ["/attendance", "attendance"],
  ["/allowances", "payroll"],
  ["/evaluations", "evaluations"],
  ["/inventory", "inventory"],
  ["/training", "training"],
  ["/manuals", "training"],
  ["/payroll", "payroll"],
  ["/shifts", "shifts"],
  ["/sales", "sales"],
];

export function getFeatureForPathname(pathname: string): FeatureKey | undefined {
  const normalizedPath = pathname.split(/[?#]/, 1)[0] || "/";
  return FEATURE_ROUTE_PREFIXES.find(
    ([prefix]) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  )?.[1];
}
