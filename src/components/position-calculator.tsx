"use client";

import { useMemo, useState } from "react";
import { calculatePositionSize } from "@/lib/calc/positionSize";
import { formatNumber } from "@/lib/money";
import { Card, Field, Input } from "@/components/ui";

const n = (v: string) => (v === "" ? null : Number(v));

export function PositionCalculator() {
  const [totalCapital, setTotalCapital] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [leverage, setLeverage] = useState("1");
  const [takeProfit, setTakeProfit] = useState("");

  const result = useMemo(() => {
    const cap = n(totalCapital);
    const risk = n(riskPct);
    const entry = n(entryPrice);
    const stop = n(stopLoss);
    const lev = n(leverage);
    if (
      cap == null ||
      risk == null ||
      entry == null ||
      stop == null ||
      lev == null
    )
      return null;
    if (
      ![cap, risk, entry, stop, lev].every(Number.isFinite) ||
      cap <= 0 ||
      risk <= 0 ||
      risk > 100 ||
      entry <= 0 ||
      stop <= 0 ||
      stop === entry ||
      lev < 1
    )
      return null;
    return calculatePositionSize({
      totalCapital: cap,
      leverage: lev,
      riskPct: risk,
      entryPrice: entry,
      stopLoss: stop,
      takeProfit: n(takeProfit),
    });
  }, [totalCapital, riskPct, entryPrice, stopLoss, takeProfit, leverage]);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Position-size calculator</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Total capital">
          <Input
            type="number"
            step="any"
            value={totalCapital}
            onChange={(e) => setTotalCapital(e.target.value)}
          />
        </Field>
        <Field label="% Risk">
          <Input
            type="number"
            step="any"
            value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)}
          />
        </Field>
        <Field label="Entry price">
          <Input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
          />
        </Field>
        <Field label="Stop loss">
          <Input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
          />
        </Field>
        <Field label="Take profit">
          <Input
            type="number"
            step="any"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
          />
        </Field>
        <Field label="Leverage (×)" hint="1 = unleveraged">
          <Input
            aria-label="Leverage"
            type="number"
            min="1"
            step="any"
            value={leverage}
            onChange={(e) => setLeverage(e.target.value)}
          />
        </Field>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        Position size is based on your risk budget and stop distance. Leverage
        changes the margin required, while the calculated position size and
        price-based profit/loss stay the same. Estimates exclude fees, funding,
        slippage, and broker margin rules.
      </p>
      {leverage !== "" &&
        (!Number.isFinite(Number(leverage)) || Number(leverage) < 1) && (
          <p role="alert" className="mt-3 text-sm text-negative">
            Leverage must be at least 1×.
          </p>
        )}
      {result?.insufficientMargin && (
        <p role="status" className="mt-3 text-sm text-negative">
          Required margin exceeds total capital. Reduce your risk budget or
          review your leverage.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-[var(--radius)] bg-surface-2 p-4 md:grid-cols-4">
        <Out
          label="Margin required"
          value={result ? formatNumber(result.marginRequired, 2) : "—"}
        />
        <Out
          label="Margin / capital"
          value={result ? `${formatNumber(result.marginUsagePct)}%` : "—"}
        />
        <Out
          label="Effective account leverage"
          value={result ? `${formatNumber(result.effectiveLeverage)}×` : "—"}
        />
        <Out
          label="Target return on margin"
          value={
            result?.rewardOnMarginPct != null
              ? `${formatNumber(result.rewardOnMarginPct)}%`
              : "—"
          }
        />
        <Out
          label="Position size"
          value={result ? formatNumber(result.positionSize, 4) : "—"}
        />
        <Out
          label="Position value"
          value={result ? formatNumber(result.positionValue, 2) : "—"}
        />
        <Out
          label="Loss at stop (before costs)"
          value={result ? formatNumber(result.maxRisk, 2) : "—"}
        />
        <Out
          label="Profit at target (before costs)"
          value={
            result?.maxReward != null ? formatNumber(result.maxReward, 2) : "—"
          }
        />
        <Out
          label="Notional / capital"
          value={result ? `${formatNumber(result.capitalUsagePct)}%` : "—"}
        />
        <Out
          label="Planned RRR"
          value={
            result?.plannedRRR != null ? formatNumber(result.plannedRRR) : "—"
          }
        />
        <Out
          label="Risk per unit"
          value={result ? formatNumber(result.riskPerUnit, 4) : "—"}
        />
        <Out
          label="Target return on capital"
          value={
            result?.potentialNetPLPct != null
              ? `${formatNumber(result.potentialNetPLPct)}%`
              : "—"
          }
        />
      </div>
    </Card>
  );
}

function Out({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
