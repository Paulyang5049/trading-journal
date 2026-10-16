"use client";

import { useMemo, useState } from "react";
import { ScreenshotInput } from "@/components/screenshot-input";
import { deriveTrade } from "@/lib/analytics";
import { dec, formatNumber } from "@/lib/money";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  plClass,
} from "@/components/ui";

export interface Option {
  id: string;
  label: string;
}

export interface TradeFormData {
  id?: string;
  accountId: string;
  assetId: string;
  strategyId: string | null;
  emotionId: string | null;
  direction: string;
  size: number;
  leverage: number;
  entryTime: string; // datetime-local
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitTime: string | null;
  exitPrice: number | null;
  fees: number;
  exitFees: number;
  riskPct: number | null;
  capitalUsagePct: number | null;
  confidence: number | null;
  discipline: number | null;
  notes: string | null;
  mistakeIds: string[];
}

interface Props {
  action: (form: FormData) => void;
  accounts: Option[];
  assets: Option[];
  strategies: Option[];
  emotions: Option[];
  mistakes: Option[];
  initial?: TradeFormData;
}

const n = (v: string) => (v === "" ? null : Number(v));

export function TradeForm({
  action,
  accounts,
  assets,
  strategies,
  emotions,
  mistakes,
  initial,
}: Props) {
  const [direction, setDirection] = useState(initial?.direction ?? "LONG");
  const [leverage, setLeverage] = useState(String(initial?.leverage ?? 1));
  const validLeverage =
    Number.isFinite(Number(leverage)) && Number(leverage) >= 1;
  const [size, setSize] = useState(String(initial?.size ?? ""));
  const [entryPrice, setEntryPrice] = useState(
    String(initial?.entryPrice ?? ""),
  );
  const [stopLoss, setStopLoss] = useState(String(initial?.stopLoss ?? ""));
  const [takeProfit, setTakeProfit] = useState(
    String(initial?.takeProfit ?? ""),
  );
  const [exitPrice, setExitPrice] = useState(String(initial?.exitPrice ?? ""));
  const [exitFees, setExitFees] = useState(String(initial?.exitFees ?? ""));
  const [fees, setFees] = useState(String(initial?.fees ?? ""));
  const margin =
    validLeverage && Number(size) > 0 && Number(entryPrice) > 0
      ? dec(size).times(entryPrice).div(leverage).toNumber()
      : null;

  const derived = useMemo(() => {
    const ep = n(entryPrice);
    const sz = n(size);
    if (ep == null || sz == null) return null;
    return deriveTrade({
      direction: direction === "SHORT" ? "SHORT" : "LONG",
      size: sz,
      entryTime: new Date(),
      entryPrice: ep,
      stopLoss: n(stopLoss),
      takeProfit: n(takeProfit),
      exitTime: exitPrice ? new Date() : null,
      exitPrice: n(exitPrice),
      fees: n(fees) ?? 0,
      exitFees: n(exitFees) ?? 0,
      status: exitPrice ? "CLOSED" : "OPEN",
    });
  }, [
    direction,
    size,
    entryPrice,
    stopLoss,
    takeProfit,
    exitPrice,
    fees,
    exitFees,
  ]);

  return (
    <form action={action} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Setup</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Account">
            <Select
              name="accountId"
              defaultValue={initial?.accountId ?? accounts[0]?.id}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Asset">
            <Select
              name="assetId"
              defaultValue={initial?.assetId ?? assets[0]?.id}
              required
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Strategy">
            <Select name="strategyId" defaultValue={initial?.strategyId ?? ""}>
              <option value="">—</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Direction">
            <Select
              name="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="LONG">Long</option>
              <option value="SHORT">Short</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Open position</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Entry time">
            <Input
              type="datetime-local"
              name="entryTime"
              defaultValue={initial?.entryTime ?? ""}
            />
          </Field>
          <Field label="Size (units)">
            <Input
              name="size"
              type="number"
              step="any"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              required
            />
          </Field>
          <Field label="Entry price">
            <Input
              name="entryPrice"
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Leverage (×)"
            hint="1× = unleveraged. Enter your exchange leverage."
          >
            <Input
              aria-label="Leverage"
              name="leverage"
              type="number"
              min="1"
              step="any"
              required
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
            />
          </Field>
          <Field
            label="Entry / existing fees"
            hint="For older or imported trades, this may already include total fees."
          >
            <Input
              name="fees"
              type="number"
              step="any"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
            />
          </Field>
          <Field label="Stop loss">
            <Input
              name="stopLoss"
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
          </Field>
          <Field label="Take profit">
            <Input
              name="takeProfit"
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
            />
          </Field>
          <Field label="% Risk">
            <Input
              name="riskPct"
              type="number"
              step="any"
              defaultValue={initial?.riskPct ?? ""}
            />
          </Field>
          <Field label="% Capital usage">
            <Input
              name="capitalUsagePct"
              type="number"
              step="any"
              defaultValue={initial?.capitalUsagePct ?? ""}
            />
          </Field>
        </div>
        <ScreenshotInput name="entryImages" label="Entry screenshots" />
      </Card>

      {!validLeverage && (
        <p role="alert" className="text-sm text-negative">
          Leverage must be at least 1×.
        </p>
      )}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Close position</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Exit time">
            <Input
              type="datetime-local"
              name="exitTime"
              defaultValue={initial?.exitTime ?? ""}
            />
          </Field>
          <Field label="Exit price" hint="Leave blank to keep the trade open">
            <Input
              name="exitPrice"
              type="number"
              step="any"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
            />
          </Field>
          <Field label="Exit fees">
            <Input
              aria-label="Exit fees"
              name="exitFees"
              type="number"
              step="any"
              value={exitFees}
              onChange={(e) => setExitFees(e.target.value)}
            />
          </Field>
        </div>
        <ScreenshotInput name="exitImages" label="Exit screenshots" />
      </Card>

      {/* Live computed summary */}
      {derived && (
        <Card className="bg-surface-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Live calculation
          </h2>
          <p className="mb-3 text-xs text-muted">
            Margin = size × entry price ÷ leverage, before fees and broker
            adjustments. Size is the full position in units; leverage does not
            multiply P/L again.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <Metric
              label="Estimated initial margin"
              value={margin != null ? formatNumber(margin) : "—"}
            />
            <Metric
              label="Planned RRR"
              value={
                derived.plannedRRR != null
                  ? formatNumber(derived.plannedRRR)
                  : "—"
              }
            />
            {derived.isClosed ? (
              <>
                <Metric
                  label="Net P/L"
                  value={formatNumber(derived.netPL)}
                  className={plClass(derived.netPL)}
                />
                <Metric
                  label="Net P/L %"
                  value={`${formatNumber(derived.netPLPct)}%`}
                  className={plClass(derived.netPL)}
                />
                <Metric
                  label="Actual RRR"
                  value={
                    derived.actualRRR != null
                      ? formatNumber(derived.actualRRR)
                      : "—"
                  }
                />
              </>
            ) : (
              <Metric label="Status" value="Open" />
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Post-trade review</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Emotion">
            <Select name="emotionId" defaultValue={initial?.emotionId ?? ""}>
              <option value="">—</option>
              {emotions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Confidence (1-5)">
            <Input
              name="confidence"
              type="number"
              min={1}
              max={5}
              defaultValue={initial?.confidence ?? ""}
            />
          </Field>
          <Field label="Discipline (1-5)">
            <Input
              name="discipline"
              type="number"
              min={1}
              max={5}
              defaultValue={initial?.discipline ?? ""}
            />
          </Field>
        </div>
        {mistakes.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-muted">Mistakes</p>
            <div className="flex flex-wrap gap-3">
              {mistakes.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="mistakes"
                    value={m.id}
                    defaultChecked={initial?.mistakeIds.includes(m.id)}
                    className="accent-[var(--primary)]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4">
          <Field label="Notes (markdown)">
            <Textarea
              name="notes"
              rows={5}
              defaultValue={initial?.notes ?? ""}
              placeholder="What was your thesis? What did you learn?"
            />
          </Field>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={!validLeverage}>
          {initial?.id ? "Save changes" : "Create trade"}
        </Button>
      </div>
    </form>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${className ?? ""}`}>
        {value}
      </p>
    </div>
  );
}
