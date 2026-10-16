"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  closePosition,
  completeReview,
  removeTrade,
} from "@/app/trades/workflow-actions";
import { formatCurrency, formatNumber } from "@/lib/money";
import { toLocalInput } from "@/lib/format";
import { Button, Input, Textarea, Field, plClass } from "./ui";

export type WorkbenchTrade = {
  id: string;
  symbol: string;
  account: string;
  currency: string;
  direction: string;
  status: string;
  entryTime: string;
  entryPrice: number;
  size: number;
  netPL: number;
  strategy: string;
  notes: string;
  confidence: number | null;
  discipline: number | null;
  reviewed: boolean;
  leverage: number;
  margin: number;
};
export function TradeWorkbench({
  trades,
  initialId,
}: {
  trades: WorkbenchTrade[];
  initialId?: string;
}) {
  const [selected, setSelected] = useState<string | null>(initialId ?? null);
  const [sort, setSort] = useState("recent");
  const dialog = useRef<HTMLDialogElement>(null);
  const trade = trades.find((t) => t.id === selected);
  useEffect(() => {
    if (trade) dialog.current?.showModal();
    else dialog.current?.close();
  }, [trade]);
  const ordered = [...trades].sort((a, b) =>
    sort === "pnl" ? b.netPL - a.netPL : b.entryTime.localeCompare(a.entryTime),
  );
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {trades.length} {trades.length === 1 ? "trade" : "trades"} · Select a
          trade to review or close it
        </p>
        <select
          aria-label="Sort trades"
          className="rounded-lg border bg-surface p-2 text-xs"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="recent">Newest first</option>
          <option value="pnl">Highest net P/L</option>
        </select>
      </div>
      <div className="overflow-auto rounded-xl border bg-surface">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              {[
                "Trade",
                "Account / strategy",
                "Entry",
                "Status",
                "Net P/L",
                "",
              ].map((s, i) => (
                <th key={i} className="px-4 py-3">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((t) => (
              <tr key={t.id} className="border-t hover:bg-primary/5">
                <td className="px-4 py-4">
                  <button
                    className="text-left font-semibold text-primary"
                    onClick={() => setSelected(t.id)}
                  >
                    {t.symbol}
                    <span
                      className="mt-1 block text-[10px] font-normal text-muted"
                      title={String(t.size)}
                    >
                      {t.direction} ·{" "}
                      {new Intl.NumberFormat("en-US", {
                        maximumSignificantDigits: 8,
                      }).format(t.size)}{" "}
                      units · {t.leverage}×
                    </span>
                  </button>
                </td>
                <td className="px-4">
                  <p>{t.account}</p>
                  <p className="text-xs text-muted">{t.strategy}</p>
                </td>
                <td className="px-4 text-xs text-muted">
                  {new Date(t.entryTime).toLocaleString()}
                </td>
                <td className="px-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${t.status === "OPEN" ? "bg-primary/10 text-primary" : t.reviewed ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"}`}
                  >
                    {t.status === "OPEN"
                      ? "Open"
                      : t.reviewed
                        ? "Reviewed"
                        : "To review"}
                  </span>
                </td>
                <td className={`px-4 font-semibold ${plClass(t.netPL)}`}>
                  {t.status === "CLOSED"
                    ? formatCurrency(t.netPL, t.currency)
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <Button variant="ghost" onClick={() => setSelected(t.id)}>
                      {t.status === "OPEN" ? "Details / close" : "Review"}
                    </Button>
                    <DeleteTradeButton trade={t} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!trades.length && (
          <p className="p-12 text-center text-sm text-muted">
            No matching trades. Adjust your filters or log a new trade.
          </p>
        )}
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-xl border-l bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/35"
      >
        {trade && (
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs text-muted">
                  {trade.account} · {trade.direction}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">{trade.symbol}</h2>
              </div>
              <Button
                autoFocus
                variant="ghost"
                aria-label="Close trade panel"
                onClick={() => setSelected(null)}
              >
                ✕
              </Button>
            </div>
            <div className="mb-6 grid grid-cols-3 gap-3 rounded-xl bg-surface-2 p-4">
              <div>
                <p className="text-xs text-muted">Entry</p>
                {formatNumber(trade.entryPrice)}
              </div>
              <div>
                <p className="text-xs text-muted">Initial margin</p>
                {formatCurrency(trade.margin, trade.currency)}
              </div>
              <div>
                <p className="text-xs text-muted">Net P/L</p>
                {trade.status === "CLOSED"
                  ? formatCurrency(trade.netPL, trade.currency)
                  : "Open"}
              </div>
            </div>
            <WorkflowForm key={`${trade.id}-${trade.status}`} trade={trade} />
            <Link
              className="mt-6 block text-sm text-primary"
              href={`/trades/${trade.id}`}
            >
              Full trade, screenshots & editing →
            </Link>
          </div>
        )}
      </dialog>
    </section>
  );
}
function WorkflowForm({ trade }: { trade: WorkbenchTrade }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    trade.status === "OPEN" ? closePosition : completeReview,
    {},
  );
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={trade.id} />
      <h3 className="font-semibold">
        {trade.status === "OPEN" ? "Close this position" : "Trade review"}
      </h3>
      {trade.status === "OPEN" ? (
        <>
          <Field label="Exit price">
            <Input
              aria-label="Exit price"
              name="exitPrice"
              type="number"
              min="0.00000001"
              step="any"
              required
            />
          </Field>
          <Field label="Exit time">
            <Input
              aria-label="Exit time"
              name="exitTime"
              type="datetime-local"
              defaultValue={toLocalInput(new Date())}
              required
            />
          </Field>
          <Field label="Exit fees">
            <Input name="exitFees" type="number" step="any" defaultValue="0" />
          </Field>
        </>
      ) : (
        <>
          <Field label="Notes and lesson">
            <Textarea
              aria-label="Notes and lesson"
              name="notes"
              rows={5}
              defaultValue={trade.notes}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Confidence (1–5)">
              <Input
                aria-label="Confidence"
                name="confidence"
                type="number"
                min="1"
                max="5"
                defaultValue={trade.confidence ?? ""}
                required
              />
            </Field>
            <Field label="Discipline (1–5)">
              <Input
                aria-label="Discipline"
                name="discipline"
                type="number"
                min="1"
                max="5"
                defaultValue={trade.discipline ?? ""}
                required
              />
            </Field>
          </div>
        </>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-negative">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-positive">
          {state.success}
        </p>
      )}
      <Button disabled={pending}>
        {pending
          ? "Saving…"
          : trade.status === "OPEN"
            ? "Close position"
            : "Save review"}
      </Button>
    </form>
  );
}

function DeleteTradeButton({ trade }: { trade: WorkbenchTrade }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(removeTrade, {});
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete the ${trade.symbol} trade from ${trade.account}? This cannot be undone.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={trade.id} />
      <Button
        variant="ghost"
        type="submit"
        disabled={pending}
        aria-label={`Delete ${trade.symbol} trade`}
        className="text-negative"
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {state.error && (
        <p
          role="alert"
          className="max-w-48 whitespace-normal text-xs text-negative"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
