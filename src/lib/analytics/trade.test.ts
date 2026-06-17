import { describe, it, expect } from "vitest";
import { deriveTrade } from "./trade";
import type { TradeInput } from "./types";

const base: TradeInput = {
  direction: "LONG",
  size: 100,
  entryTime: new Date("2024-01-01T10:00:00Z"),
  entryPrice: 50,
  stopLoss: 45,
  takeProfit: 65,
  status: "CLOSED",
  exitTime: new Date("2024-01-01T12:30:00Z"),
  exitPrice: 60,
  fees: 10,
};

describe("deriveTrade", () => {
  it("computes a winning LONG trade", () => {
    const d = deriveTrade(base);
    expect(d.grossPL).toBe(1000); // (60-50)*100
    expect(d.netPL).toBe(990); // -10 fees
    expect(d.netPLPct).toBeCloseTo(19.8, 5); // 990 / (50*100) * 100
    expect(d.plannedRRR).toBeCloseTo(3, 5); // |65-50| / |50-45|
    expect(d.actualRRR).toBeCloseTo(2, 5); // (60-50)/5
    expect(d.durationMin).toBe(150);
    expect(d.outcome).toBe("WIN");
    expect(d.isClosed).toBe(true);
  });

  it("computes a losing SHORT trade", () => {
    const d = deriveTrade({
      ...base,
      direction: "SHORT",
      entryPrice: 50,
      stopLoss: 55,
      takeProfit: 40,
      exitPrice: 53,
      fees: 0,
    });
    expect(d.grossPL).toBe(-300); // (50-53)*100
    expect(d.netPL).toBe(-300);
    expect(d.actualRRR).toBeCloseTo(-0.6, 5); // (50-53)/5
    expect(d.outcome).toBe("LOSS");
  });

  it("treats fees-only break-even as EVEN", () => {
    const d = deriveTrade({ ...base, exitPrice: 50, fees: 0 });
    expect(d.netPL).toBe(0);
    expect(d.outcome).toBe("EVEN");
  });

  it("returns null realized fields while OPEN", () => {
    const d = deriveTrade({ ...base, status: "OPEN", exitPrice: null });
    expect(d.isClosed).toBe(false);
    expect(d.netPL).toBe(0);
    expect(d.outcome).toBeNull();
    expect(d.actualRRR).toBeNull();
    expect(d.plannedRRR).toBeCloseTo(3, 5); // planned still known
  });

  it("handles missing stop loss (no RRR)", () => {
    const d = deriveTrade({ ...base, stopLoss: null, takeProfit: null });
    expect(d.plannedRRR).toBeNull();
    expect(d.actualRRR).toBeNull();
    expect(d.netPL).toBe(990);
  });
});
