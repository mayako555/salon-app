import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateContractorCommission,
  contractorCommissionTotal,
  hydrateContractorCommissionLines,
  serializeContractorCommissionLines,
  type ContractorCommissionLineDraft,
} from "@/lib/contractor-commission";

describe("contractor commission calculation", () => {
  it("separates normal 50% work and makeup lesson 60% work", () => {
    const lines: ContractorCommissionLineDraft[] = [
      { id: "normal", method: "default", label: "通常施術", calculationBase: "49809", rate: "50" },
      { id: "makeup", method: "menu_specific", label: "メイクレッスン", calculationBase: "20000", rate: "60" },
    ];

    assert.equal(calculateContractorCommission(49_809, 50), 24_904);
    assert.equal(calculateContractorCommission(20_000, 60), 12_000);
    assert.equal(contractorCommissionTotal(lines), 36_904);
  });

  it("supports a manually selected custom percentage", () => {
    assert.equal(calculateContractorCommission(10_001, 37.5), 3_750);
  });

  it("preserves calculation rows through save and reload", () => {
    const lines: ContractorCommissionLineDraft[] = [
      { id: "makeup", method: "menu_specific", label: " メイクレッスン ", calculationBase: "20000", rate: "60" },
    ];
    const saved = serializeContractorCommissionLines(lines);

    assert.deepEqual(saved, [{
      id: "makeup",
      method: "menu_specific",
      label: "メイクレッスン",
      calculation_base: 20_000,
      rate: 60,
      commission_amount: 12_000,
    }]);
    assert.deepEqual(hydrateContractorCommissionLines(saved), [{
      id: "makeup",
      method: "menu_specific",
      label: "メイクレッスン",
      calculationBase: "20000",
      rate: "60",
    }]);
  });

  it("guards against negative bases and invalid percentages", () => {
    assert.equal(calculateContractorCommission(-1000, 50), 0);
    assert.equal(calculateContractorCommission(1000, 120), 1000);
  });
});
