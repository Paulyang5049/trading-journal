"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Button, plClass } from "./ui";
import { formatCurrency } from "@/lib/money";

type DayTrade = { id: string; date: string; symbol: string; netPL: number };

export function PnlCalendar({
  trades,
  currency,
}: {
  trades: DayTrade[];
  currency: string;
}) {
  const [month, setMonth] = useState(() =>
    (
      trades
        .map((t) => t.date)
        .sort()
        .at(-1) ?? new Date().toISOString().slice(0, 10)
    ).slice(0, 7),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1));
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const monthly = trades.filter((t) => t.date.startsWith(month));
  function move(delta: number) {
    setMonth(
      new Date(Date.UTC(year, index - 1 + delta, 1)).toISOString().slice(0, 7),
    );
    setSelected(null);
  }
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Trading calendar</h2>
          <p className="mt-1 text-xs text-muted">
            Realized net P/L by exit date · UTC
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            aria-label="Previous month"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-28 text-center text-sm">
            {first.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
          <Button
            variant="ghost"
            aria-label="Next month"
            onClick={() => move(1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <div className="mb-3 flex gap-4 text-xs text-muted">
        <span>{monthly.length} closed trades</span>
        <span className={plClass(monthly.reduce((s, t) => s + t.netPL, 0))}>
          {formatCurrency(
            monthly.reduce((s, t) => s + t.netPL, 0),
            currency,
          )}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="pb-2 text-center text-[10px] text-muted">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const daily = monthly.filter((t) => t.date === date);
          const pnl = daily.reduce((s, t) => s + t.netPL, 0);
          return (
            <button
              key={date}
              disabled={!daily.length}
              onClick={() => setSelected(selected === date ? null : date)}
              aria-pressed={selected === date}
              aria-label={`${date}, ${daily.length} trades, ${formatCurrency(pnl, currency)}`}
              className={`min-h-20 min-w-0 rounded-lg border p-1 text-left sm:p-3 ${selected === date ? "ring-2 ring-primary" : ""} ${daily.length ? (pnl > 0 ? "bg-positive/8" : pnl < 0 ? "bg-negative/8" : "bg-surface-2") : "text-muted"}`}
            >
              <span className="block text-xs">{i + 1}</span>
              {daily.length > 0 && (
                <>
                  <span
                    className={`mt-2 block truncate text-[10px] font-semibold sm:text-xs ${plClass(pnl)}`}
                  >
                    {formatCurrency(pnl, currency)}
                  </span>
                  <span className="hidden text-[10px] text-muted sm:block">
                    {daily.length} trades
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs text-muted">Trades closed on {selected}</p>
          {monthly
            .filter((t) => t.date === selected)
            .map((t) => (
              <Link
                key={t.id}
                href={`/trades/${t.id}`}
                className="flex justify-between rounded p-2 text-sm hover:bg-surface-2"
              >
                <span>{t.symbol} ↗</span>
                <span className={plClass(t.netPL)}>
                  {formatCurrency(t.netPL, currency)}
                </span>
              </Link>
            ))}
        </div>
      )}
    </Card>
  );
}
