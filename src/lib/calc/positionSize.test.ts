import { describe, it, expect } from "vitest";
import { calculatePositionSize } from "./positionSize";

describe("calculatePositionSize", () => {
  it("sizes a position to risk exactly riskPct of capital", () => {
    const r = calculatePositionSize({
      totalCapital: 10000,
      riskPct: 2,
      entryPrice: 100,
      stopLoss: 95,
      takeProfit: 115,
    });
    expect(r.riskAmount).toBe(200); // 2% of 10000
    expect(r.riskPerUnit).toBe(5); // |100-95|
    expect(r.positionSize).toBe(40); // 200 / 5
    expect(r.positionValue).toBe(4000); // 40 * 100
    expect(r.capitalUsagePct).toBe(40);
    expect(r.maxRisk).toBe(200);
    expect(r.maxReward).toBe(600); // |115-100| * 40
    expect(r.plannedRRR).toBeCloseTo(3, 5); // 15 / 5
    expect(r.potentialNetPLPct).toBeCloseTo(6, 5); // 600 / 10000 * 100
  });

  it("handles no take-profit", () => {
    const r = calculatePositionSize({
      totalCapital: 5000,
      riskPct: 1,
      entryPrice: 50,
      stopLoss: 48,
    });
    expect(r.positionSize).toBe(25); // 50 risk / 2 per unit
    expect(r.maxReward).toBeNull();
    expect(r.plannedRRR).toBeNull();
  });

  it("avoids divide-by-zero when entry equals stop", () => {
    const r = calculatePositionSize({
      totalCapital: 1000,
      riskPct: 1,
      entryPrice: 50,
      stopLoss: 50,
    });
    expect(r.positionSize).toBe(0);
  });
});

describe("leverage and margin", () => {
  const input = {
    totalCapital: 1000,
    riskPct: 2,
    entryPrice: 100,
    stopLoss: 99,
    takeProfit: 103,
  };
  it("reduces margin without multiplying risk-based size or P/L", () => {
    const cash = calculatePositionSize(input);
    const leveraged = calculatePositionSize({ ...input, leverage: 5 });
    expect(cash.marginRequired).toBe(2000);
    expect(cash.insufficientMargin).toBe(true);
    expect(leveraged.marginRequired).toBe(400);
    expect(leveraged.marginUsagePct).toBe(40);
    expect(leveraged.effectiveLeverage).toBe(2);
    expect(leveraged.rewardOnMarginPct).toBe(15);
    expect(leveraged.insufficientMargin).toBe(false);
    expect(leveraged.positionSize).toBe(cash.positionSize);
    expect(leveraged.maxRisk).toBe(20);
    expect(leveraged.maxReward).toBe(60);
  });
  it("supports short positions and exact margin capacity", () => {
    const r = calculatePositionSize({
      ...input,
      direction: "SHORT",
      stopLoss: 101,
      takeProfit: 97,
      leverage: 2,
    });
    expect(r.marginRequired).toBe(1000);
    expect(r.insufficientMargin).toBe(false);
    expect(r.maxReward).toBe(60);
  });
  it.each([0, -1, 0.5, NaN, Infinity])(
    "rejects invalid leverage %s",
    (leverage) => {
      expect(() => calculatePositionSize({ ...input, leverage })).toThrow(
        "Leverage must be at least 1x.",
      );
    },
  );
  it("does not invent a return when the target is missing", () => {
    expect(
      calculatePositionSize({ ...input, takeProfit: null, leverage: 5 })
        .rewardOnMarginPct,
    ).toBeNull();
  });
});
