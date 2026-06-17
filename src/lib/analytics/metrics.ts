import type { DerivedTrade } from "./types";

export interface Summary {
  totalTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  evens: number;
  winRate: number; // % of closed trades that are wins
  totalNetPL: number;
  totalWin: number; // sum of winning net P/L (>= 0)
  totalLoss: number; // sum of losing net P/L (<= 0)
  avgProfit: number; // mean net P/L of winners
  avgLoss: number; // mean net P/L of losers (negative)
  avgNetPL: number; // mean net P/L across closed trades
  bestTrade: number;
  worstTrade: number;
  expectancy: number; // avg net P/L per trade
  profitFactor: number; // gross win / gross loss (abs); Infinity if no losses
  wlRatio: number; // wins / losses; Infinity if no losses
  avgActualRRR: number; // mean of defined actual R-multiples
  avgPlannedRRR: number;
}

const closed = (trades: DerivedTrade[]) => trades.filter((t) => t.isClosed);

export function winRate(trades: DerivedTrade[]): number {
  const c = closed(trades);
  if (c.length === 0) return 0;
  const wins = c.filter((t) => t.outcome === "WIN").length;
  return (wins / c.length) * 100;
}

export function expectancy(trades: DerivedTrade[]): number {
  const c = closed(trades);
  if (c.length === 0) return 0;
  return c.reduce((s, t) => s + t.netPL, 0) / c.length;
}

export function profitFactor(trades: DerivedTrade[]): number {
  const c = closed(trades);
  const grossWin = c.filter((t) => t.netPL > 0).reduce((s, t) => s + t.netPL, 0);
  const grossLoss = Math.abs(
    c.filter((t) => t.netPL < 0).reduce((s, t) => s + t.netPL, 0),
  );
  if (grossLoss === 0) return grossWin > 0 ? Infinity : 0;
  return grossWin / grossLoss;
}

function mean(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

export function summarize(trades: DerivedTrade[]): Summary {
  const c = closed(trades);
  const winsArr = c.filter((t) => t.outcome === "WIN");
  const lossArr = c.filter((t) => t.outcome === "LOSS");
  const evenArr = c.filter((t) => t.outcome === "EVEN");
  const netPLs = c.map((t) => t.netPL);
  const rrrs = c.map((t) => t.actualRRR).filter((r): r is number => r != null);
  const planned = trades
    .map((t) => t.plannedRRR)
    .filter((r): r is number => r != null);

  return {
    totalTrades: trades.length,
    closedTrades: c.length,
    wins: winsArr.length,
    losses: lossArr.length,
    evens: evenArr.length,
    winRate: winRate(trades),
    totalNetPL: netPLs.reduce((s, n) => s + n, 0),
    totalWin: winsArr.reduce((s, t) => s + t.netPL, 0),
    totalLoss: lossArr.reduce((s, t) => s + t.netPL, 0),
    avgProfit: mean(winsArr.map((t) => t.netPL)),
    avgLoss: mean(lossArr.map((t) => t.netPL)),
    avgNetPL: mean(netPLs),
    bestTrade: c.length ? Math.max(...netPLs) : 0,
    worstTrade: c.length ? Math.min(...netPLs) : 0,
    expectancy: expectancy(trades),
    profitFactor: profitFactor(trades),
    wlRatio: lossArr.length
      ? winsArr.length / lossArr.length
      : winsArr.length > 0
        ? Infinity
        : 0,
    avgActualRRR: mean(rrrs),
    avgPlannedRRR: mean(planned),
  };
}

export interface DrawdownResult {
  maxDrawdown: number; // absolute, >= 0
  maxDrawdownPct: number; // percent of running peak, >= 0
}

/**
 * Max peak-to-trough decline over an equity series (chronological).
 */
export function maxDrawdown(equitySeries: number[]): DrawdownResult {
  let peak = -Infinity;
  let maxDD = 0;
  let maxDDPct = 0;
  for (const v of equitySeries) {
    if (v > peak) peak = v;
    const dd = peak - v;
    if (dd > maxDD) maxDD = dd;
    if (peak > 0) {
      const ddPct = (dd / peak) * 100;
      if (ddPct > maxDDPct) maxDDPct = ddPct;
    }
  }
  return { maxDrawdown: maxDD, maxDrawdownPct: maxDDPct };
}
