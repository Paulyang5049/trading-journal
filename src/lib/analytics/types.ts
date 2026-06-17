// Plain, framework-agnostic shapes the analytics layer operates on.
// The DB layer maps Prisma rows into these (numbers, not Decimal) before
// handing them to pure functions, keeping the math easy to unit-test.

export type Direction = "LONG" | "SHORT";
export type TradeStatus = "OPEN" | "CLOSED";
export type Outcome = "WIN" | "LOSS" | "EVEN";

export interface TradeInput {
  direction: Direction;
  size: number;
  entryTime: Date;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  exitTime?: Date | null;
  exitPrice?: number | null;
  fees?: number | null;
  status: TradeStatus;
}

export interface DerivedTrade {
  grossPL: number;
  netPL: number;
  netPLPct: number; // return on notional (entryPrice * size), percent
  plannedRRR: number | null;
  actualRRR: number | null; // R-multiple, signed
  durationMin: number | null;
  outcome: Outcome | null; // null while OPEN
  isClosed: boolean;
}
