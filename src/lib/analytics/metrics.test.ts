import { describe, it, expect } from "vitest";
import { summarize, winRate, profitFactor, expectancy, maxDrawdown } from "./metrics";
import type { DerivedTrade } from "./types";

function closed(netPL: number, actualRRR = 0): DerivedTrade {
  return {
    grossPL: netPL,
    netPL,
    netPLPct: 0,
    plannedRRR: null,
    actualRRR,
    durationMin: 60,
    outcome: netPL > 0 ? "WIN" : netPL < 0 ? "LOSS" : "EVEN",
    isClosed: true,
  };
}

const trades = [closed(100, 2), closed(-50, -1), closed(200, 4), closed(-50, -1)];

describe("metrics", () => {
  it("winRate ignores open trades", () => {
    const open: DerivedTrade = { ...closed(0), isClosed: false, outcome: null };
    expect(winRate([...trades, open])).toBe(50); // 2 wins of 4 closed
  });

  it("profitFactor = gross win / gross loss", () => {
    expect(profitFactor(trades)).toBeCloseTo(300 / 100, 5);
  });

  it("expectancy = avg net P/L", () => {
    expect(expectancy(trades)).toBeCloseTo(200 / 4, 5); // (100-50+200-50)/4
  });

  it("profitFactor is Infinity with no losses", () => {
    expect(profitFactor([closed(100), closed(50)])).toBe(Infinity);
  });

  it("summarize aggregates correctly", () => {
    const s = summarize(trades);
    expect(s.closedTrades).toBe(4);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(2);
    expect(s.totalNetPL).toBe(200);
    expect(s.bestTrade).toBe(200);
    expect(s.worstTrade).toBe(-50);
    expect(s.wlRatio).toBe(1);
    expect(s.avgActualRRR).toBeCloseTo((2 - 1 + 4 - 1) / 4, 5);
  });
});

describe("maxDrawdown", () => {
  it("finds the largest peak-to-trough decline", () => {
    // peak 120 -> trough 80 = 40 absolute, 33.33%
    const r = maxDrawdown([100, 120, 90, 80, 130]);
    expect(r.maxDrawdown).toBe(40);
    expect(r.maxDrawdownPct).toBeCloseTo(33.3333, 3);
  });

  it("is zero for a monotonically rising series", () => {
    expect(maxDrawdown([10, 20, 30]).maxDrawdown).toBe(0);
  });
});
