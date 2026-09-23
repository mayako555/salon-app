export type ContractorCommissionMethod = "default" | "menu_specific" | "custom";

export type ContractorCommissionLine = {
  id: string;
  method: ContractorCommissionMethod;
  label: string;
  calculation_base: number;
  rate: number;
  commission_amount: number;
};

export type ContractorCommissionLineDraft = {
  id: string;
  method: ContractorCommissionMethod;
  label: string;
  calculationBase: string;
  rate: string;
};

export function calculateContractorCommission(base: number, rate: number): number {
  const safeBase = Math.max(0, Number.isFinite(base) ? base : 0);
  const safeRate = Math.min(100, Math.max(0, Number.isFinite(rate) ? rate : 0));
  return Math.floor(safeBase * (safeRate / 100));
}

export function contractorCommissionTotal(lines: ContractorCommissionLineDraft[]): number {
  return lines.reduce(
    (sum, line) => sum + calculateContractorCommission(Number(line.calculationBase), Number(line.rate)),
    0,
  );
}

export function serializeContractorCommissionLines(
  lines: ContractorCommissionLineDraft[],
): ContractorCommissionLine[] {
  return lines.map((line) => {
    const calculationBase = Math.max(0, Number(line.calculationBase) || 0);
    const rate = Math.min(100, Math.max(0, Number(line.rate) || 0));
    return {
      id: line.id,
      method: line.method,
      label: line.label.trim() || "任意歩合",
      calculation_base: calculationBase,
      rate,
      commission_amount: calculateContractorCommission(calculationBase, rate),
    };
  });
}

export function hydrateContractorCommissionLines(
  lines?: ContractorCommissionLine[],
): ContractorCommissionLineDraft[] {
  return (lines || []).map((line) => ({
    id: line.id,
    method: line.method,
    label: line.label,
    calculationBase: String(line.calculation_base),
    rate: String(line.rate),
  }));
}
