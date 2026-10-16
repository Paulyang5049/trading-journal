import { expect, it } from "vitest";
import { positionRisk, validDay, sizeFromMargin } from "./workspace";
it("links margin and risk to the selected account without multiplying losses by leverage", () => {
  const r = positionRisk(400, 3.56, 421, 405, 5)!;
  expect(r.riskAmount).toBe(56.96);
  expect(r.riskPct).toBe(14.24);
  expect(r.margin).toBe(299.752);
  expect(positionRisk(800, 3.56, 421, 405, 5)!.riskPct).toBe(7.12);
});
it("leaves unknown risk blank and rejects unfunded accounts", () => {
  expect(positionRisk(400, 1, 100, null, 5)!.riskPct).toBeNull();
  expect(positionRisk(0, 1, 100, 95, 5)).toBeNull();
});
it("validates date filters", () => {
  expect(validDay("garbage")).toBeUndefined();
  expect(validDay("2026-10-16")).toBe("2026-10-16");
});

it("calculates units from margin and uses margin for capital usage", async () => {
  const { sizeFromMargin } = await import("./workspace");
  expect(sizeFromMargin(100, 5, 50)).toBe(10);
  const r = positionRisk(1000, 10, 50, 45, 5)!;
  expect(r.riskAmount).toBe(50);
  expect(r.riskPct).toBe(5);
  expect(r.capitalUsagePct).toBe(10);
  expect(r.notionalUsagePct).toBe(50);
  expect(sizeFromMargin(100, 5, 0)).toBeNull();
});

it("rounds down to a quantity step without exceeding margin", () => {
  expect(sizeFromMargin(100, 5, 279, 0.01)).toBe(1.79);
  expect(sizeFromMargin(1, 1, 3, 0.1)).toBe(0.3);
  expect(sizeFromMargin(0.01, 1, 100, 0.01)).toBeNull();
  expect(sizeFromMargin(100, 5, 279, 0)).toBeNull();
  expect(sizeFromMargin(100, 5, 279, NaN)).toBeNull();
});
