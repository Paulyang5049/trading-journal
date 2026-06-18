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
  const [takeProfit, setTakeProfit] = useState("");

  const result = useMemo(() => {
    const cap = n(totalCapital);
    const risk = n(riskPct);
    const entry = n(entryPrice);
    const stop = n(stopLoss);
    if (cap == null || risk == null || entry == null || stop == null) return null;
    return calculatePositionSize({
      totalCapital: cap,
      riskPct: risk,
      entryPrice: entry,
      stopLoss: stop,
      takeProfit: n(takeProfit),
    });
  }, [totalCapital, riskPct, entryPrice, stopLoss, takeProfit]);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Position-size calculator</h2>
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Total capital">
          <Input type="number" step="any" value={totalCapital} onChange={(e) => setTotalCapital(e.target.value)} />
        </Field>
        <Field label="% Risk">
          <Input type="number" step="any" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
        </Field>
        <Field label="Entry price">
          <Input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
        </Field>
        <Field label="Stop loss">
          <Input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
        </Field>
        <Field label="Take profit">
          <Input type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
        </Field>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-[var(--radius)] bg-surface-2 p-4 md:grid-cols-4">
        <Out label="Position size" value={result ? formatNumber(result.positionSize, 4) : "—"} />
        <Out label="Position value" value={result ? formatNumber(result.positionValue, 2) : "—"} />
        <Out label="Max risk" value={result ? formatNumber(result.maxRisk, 2) : "—"} />
        <Out
          label="Max reward"
          value={result?.maxReward != null ? formatNumber(result.maxReward, 2) : "—"}
        />
        <Out label="% Capital usage" value={result ? `${formatNumber(result.capitalUsagePct)}%` : "—"} />
        <Out
          label="Planned RRR"
          value={result?.plannedRRR != null ? formatNumber(result.plannedRRR) : "—"}
        />
        <Out label="Risk per unit" value={result ? formatNumber(result.riskPerUnit, 4) : "—"} />
        <Out
          label="Potential P/L %"
          value={result?.potentialNetPLPct != null ? `${formatNumber(result.potentialNetPLPct)}%` : "—"}
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
