export function normalizeSalesStaffName(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/\s+/g, "").replace(/[凛凜]/g, "凛");
}

export function deduplicateSalesStaffNames(names: Array<string | null | undefined>): string[] {
  const uniqueNames = new Map<string, string>();

  for (const name of names) {
    if (!name) continue;
    const normalizedName = normalizeSalesStaffName(name);
    if (normalizedName && !uniqueNames.has(normalizedName)) {
      uniqueNames.set(normalizedName, name);
    }
  }

  return [...uniqueNames.values()];
}
