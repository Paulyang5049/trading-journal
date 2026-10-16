import { dec } from "@/lib/money";

export interface PositionSizeInput {
  totalCapital: number; // account capital available
  riskPct: number; // % of capital to risk on this trade
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number | null;
  direction?: "LONG" | "SHORT";
  leverage?: number; // notional / initial margin; defaults to 1x
}

export interface PositionSizeResult {
  riskAmount: number; // capital at risk in currency
  riskPerUnit: number; // |entry - stop|
  positionSize: number; // units to buy/sell
  positionValue: number; // notional = size * entry
  capitalUsagePct: number; // positionValue / totalCapital * 100
  maxRisk: number; // = riskAmount (loss if stop hit)
  maxReward: number | null; // potential profit if TP hit
  plannedRRR: number | null; // reward / risk
  potentialNetPLPct: number | null; // maxReward / totalCapital * 100
  marginRequired: number;
  marginUsagePct: number;
  effectiveLeverage: number; // notional / total account capital
  rewardOnMarginPct: number | null;
  insufficientMargin: boolean;
}

/**
 * Port of the spreadsheet "Calculator": given capital, % risk, entry and stop,
 * compute the position size that risks exactly riskPct of capital, plus the
 * reward/RRR if a take-profit is supplied.
 */
export function calculatePositionSize(
  input: PositionSizeInput,
): PositionSizeResult {
  const leverage = input.leverage ?? 1;
  if (!Number.isFinite(leverage) || leverage < 1) {
    throw new RangeError("Leverage must be at least 1x.");
  }
  const capital = dec(input.totalCapital);
  const entry = dec(input.entryPrice);
  const stop = dec(input.stopLoss);
  const riskAmount = capital.times(dec(input.riskPct)).div(100);
  const riskPerUnit = entry.minus(stop).abs();

  const positionSize = riskPerUnit.isZero()
    ? dec(0)
    : riskAmount.div(riskPerUnit);
  const positionValue = positionSize.times(entry);
  const marginRequired = positionValue.div(leverage);
  const capitalUsagePct = capital.isZero()
    ? dec(0)
    : positionValue.div(capital).times(100);

  let maxReward: ReturnType<typeof dec> | null = null;
  let plannedRRR: number | null = null;
  let potentialNetPLPct: number | null = null;
  if (input.takeProfit != null) {
    const tp = dec(input.takeProfit);
    const rewardPerUnit = tp.minus(entry).abs();
    maxReward = rewardPerUnit.times(positionSize);
    plannedRRR = riskPerUnit.isZero()
      ? null
      : rewardPerUnit.div(riskPerUnit).toNumber();
    potentialNetPLPct = capital.isZero()
      ? null
      : maxReward.div(capital).times(100).toNumber();
  }

  return {
    riskAmount: riskAmount.toNumber(),
    riskPerUnit: riskPerUnit.toNumber(),
    positionSize: positionSize.toNumber(),
    positionValue: positionValue.toNumber(),
    capitalUsagePct: capitalUsagePct.toNumber(),
    maxRisk: riskAmount.toNumber(),
    maxReward: maxReward ? maxReward.toNumber() : null,
    plannedRRR,
    potentialNetPLPct,
    marginRequired: marginRequired.toNumber(),
    marginUsagePct: capital.isZero()
      ? 0
      : marginRequired.div(capital).times(100).toNumber(),
    effectiveLeverage: capital.isZero()
      ? 0
      : positionValue.div(capital).toNumber(),
    rewardOnMarginPct:
      maxReward == null || marginRequired.isZero()
        ? null
        : maxReward.div(marginRequired).times(100).toNumber(),
    insufficientMargin: marginRequired.gt(capital),
  };
}
