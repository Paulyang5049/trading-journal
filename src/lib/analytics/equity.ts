export interface EquityPoint {
  time: Date;
  equity: number;
  realizedPL: number; // cumulative realized trade P/L at this point
}

export interface EquityInput {
  startingCapital: number;
  // chronological events; deposits/withdrawals are signed amounts
  capitalEvents: { time: Date; amount: number }[];
  // closed trades contributing realized net P/L, keyed by exit time
  closedTrades: { time: Date; netPL: number }[];
}

/**
 * Build a chronological equity curve from starting capital, capital flows
 * (deposits/withdrawals) and realized trade P/L. Equity at each point is
 * startingCapital + cumulative(capital flows) + cumulative(realized P/L).
 */
export function buildEquityCurve(input: EquityInput): EquityPoint[] {
  type Ev = { time: Date; flow: number; pl: number };
  const events: Ev[] = [
    ...input.capitalEvents.map((e) => ({ time: e.time, flow: e.amount, pl: 0 })),
    ...input.closedTrades.map((t) => ({ time: t.time, flow: 0, pl: t.netPL })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  const points: EquityPoint[] = [];
  let equity = input.startingCapital;
  let realized = 0;
  for (const e of events) {
    equity += e.flow + e.pl;
    realized += e.pl;
    points.push({ time: e.time, equity, realizedPL: realized });
  }
  return points;
}
