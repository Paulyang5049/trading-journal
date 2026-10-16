"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculatePositionSize } from "@/lib/calc/positionSize";
import { formatNumber } from "@/lib/money";
import { Button, Select, Card, Field, Input } from "@/components/ui";

const n = (v: string) => (v === "" ? null : Number(v));

export function PositionCalculator({
  accounts,
  assets,
}: {
  accounts: { id: string; label: string; currency: string; equity: number }[];
  assets: { id: string; label: string }[];
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [direction, setDirection] = useState("LONG");
  const account = accounts.find((a) => a.id === accountId);
  const totalCapital = String(account?.equity ?? 0);
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
      (direction === "LONG" ? stop >= entry : stop <= entry) ||
      (n(takeProfit) != null &&
        (direction === "LONG"
          ? Number(takeProfit) <= entry
          : Number(takeProfit) >= entry)) ||
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
  }, [
    totalCapital,
    riskPct,
    entryPrice,
    stopLoss,
    takeProfit,
    leverage,
    direction,
  ]);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Position-size calculator</h2>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Field label="Account">
          <Select
            aria-label="Calculator account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.currency})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Asset">
          <Select
            aria-label="Calculator asset"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Direction">
          <Select
            aria-label="Calculator direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label={`Account equity (${account?.currency ?? "—"})`}
          hint="Realized equity; excludes unrealized P/L."
        >
          <Input type="number" step="any" value={totalCapital} readOnly />
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
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border p-3">
        <p className="text-xs text-muted">
          Choose a stop and target on the correct side of your entry. The trade
          will carry these inputs forward.
        </p>
        {result && accountId && assetId ? (
          <Link
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm text-white"
            href={`/trades/new?${new URLSearchParams({ account: accountId, asset: assetId, direction, size: String(result.positionSize), entry: entryPrice, stop: stopLoss, target: takeProfit, leverage })}`}
          >
            Create trade →
          </Link>
        ) : (
          <Button disabled>Create trade →</Button>
        )}
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
