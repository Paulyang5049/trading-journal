import { dec } from "@/lib/money";
import type { DerivedTrade, Outcome, TradeInput } from "./types";

/**
 * Derive P/L, R-multiples, duration and outcome for a single trade.
 *
 * Conventions (general spot/CFD model, mirrors the source spreadsheet):
 *   gross P/L (LONG)  = (exit - entry) * size
 *   gross P/L (SHORT) = (entry - exit) * size
 *   net P/L           = gross P/L - fees - exitFees
 *   net P/L %         = net P/L / (entry * size) * 100   (return on notional)
 *   riskPerUnit       = |entry - stopLoss|
 *   plannedRRR        = |takeProfit - entry| / riskPerUnit
 *   actualRRR         = realized move per unit / riskPerUnit   (signed R-multiple)
 *
 * An OPEN trade (no exitPrice) has zero realized P/L and a null outcome.
 */
export function deriveTrade(t: TradeInput): DerivedTrade {
  const entry = dec(t.entryPrice);
  const size = dec(t.size);
  const fees = dec(t.fees ?? 0).plus(t.exitFees ?? 0);
  const isClosed = t.status === "CLOSED" && t.exitPrice != null;

  const riskPerUnit =
    t.stopLoss != null ? entry.minus(dec(t.stopLoss)).abs() : null;

  const plannedRRR =
    t.takeProfit != null && riskPerUnit && !riskPerUnit.isZero()
      ? dec(t.takeProfit).minus(entry).abs().div(riskPerUnit).toNumber()
      : null;

  if (!isClosed) {
    return {
      grossPL: 0,
      netPL: 0,
      netPLPct: 0,
      plannedRRR,
      actualRRR: null,
      durationMin: null,
      outcome: null,
      isClosed: false,
    };
  }

  const exit = dec(t.exitPrice);
  const movePerUnit =
    t.direction === "LONG" ? exit.minus(entry) : entry.minus(exit);

  const grossPL = movePerUnit.times(size);
  const netPL = grossPL.minus(fees);

  const notional = entry.times(size);
  const netPLPct = notional.isZero()
    ? 0
    : netPL.div(notional).times(100).toNumber();

  const actualRRR =
    riskPerUnit && !riskPerUnit.isZero()
      ? movePerUnit.div(riskPerUnit).toNumber()
      : null;

  const durationMin =
    t.exitTime && t.entryTime
      ? (t.exitTime.getTime() - t.entryTime.getTime()) / 60000
      : null;

  let outcome: Outcome;
  if (netPL.isPositive() && !netPL.isZero()) outcome = "WIN";
  else if (netPL.isNegative()) outcome = "LOSS";
  else outcome = "EVEN";

  return {
    grossPL: grossPL.toNumber(),
    netPL: netPL.toNumber(),
    netPLPct,
    plannedRRR,
    actualRRR,
    durationMin,
    outcome,
    isClosed: true,
  };
}
