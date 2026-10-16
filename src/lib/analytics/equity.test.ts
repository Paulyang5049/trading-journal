import { expect, it } from "vitest";
import { buildEquityCurve } from "./equity";

it("does not show an artificial portfolio dip for a same-time transfer", () => {
  const time = new Date("2026-10-16T00:00:00Z");
  const points = buildEquityCurve({
    startingCapital: 400,
    capitalEvents: [{ time, amount: -100 }, { time, amount: 100 }],
    closedTrades: [],
  });
  expect(points).toEqual([{ time, equity: 400, realizedPL: 0 }]);
});
