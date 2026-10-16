import { dec } from "./money";

export function positionRisk(
  equity: number,
  size: number,
  entry: number,
  stop: number | null,
  leverage: number,
) {
  const valid =
    [equity, size, entry, leverage].every(Number.isFinite) &&
    equity > 0 &&
    size > 0 &&
    entry > 0 &&
    leverage >= 1;
  if (!valid) return null;
  const notional = dec(size).times(entry);
  const risk =
    stop != null && Number.isFinite(stop) && stop > 0
      ? dec(entry).minus(stop).abs().times(size)
      : null;
  return {
    margin: notional.div(leverage).toNumber(),
    riskAmount: risk?.toNumber() ?? null,
    riskPct: risk ? risk.div(equity).times(100).toNumber() : null,
    capitalUsagePct: notional.div(equity).times(100).toNumber(),
    marginPct: notional.div(leverage).div(equity).times(100).toNumber(),
  };
}

export function validDay(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
    ? value
    : undefined;
}
