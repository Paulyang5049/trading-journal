export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTrades } from "@/lib/trades";
import {
  summarize,
  maxDrawdown,
  buildEquityCurve,
  byDayOfWeek,
  byHour,
  byKey,
} from "@/lib/analytics";
import { formatCurrency, formatNumber, formatPct, num } from "@/lib/money";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  PageHeader,
  Card,
  Button,
  EmptyState,
  plClass,
} from "@/components/ui";
import { EquityChart, SignedBarChart, BarChartSimple } from "@/components/charts";

export default async function DashboardPage() {
  const [trades, accounts, events] = await Promise.all([
    getTrades(),
    prisma.account.findMany(),
    prisma.capitalEvent.findMany({ orderBy: { datetime: "asc" } }),
  ]);

  const currency = accounts[0]?.currency ?? "USD";
  const derivedList = trades.map((t) => t.derived);
  const summary = summarize(derivedList);

  if (trades.length === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Your trading performance at a glance." />
        <EmptyState
          title="Nothing to show yet"
          description="Log a few trades and your analytics will appear here."
          action={
            <Link href="/trades/new">
              <Button>Log a trade</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Equity curve across all accounts.
  const curve = buildEquityCurve({
    startingCapital: 0,
    capitalEvents: events.map((e) => ({ time: e.datetime, amount: num(e.amount) })),
    closedTrades: trades
      .filter((t) => t.derived.isClosed && t.row.exitTime)
      .map((t) => ({ time: t.row.exitTime as Date, netPL: t.derived.netPL })),
  });
  const dd = maxDrawdown(curve.map((p) => p.equity));

  // Grouping inputs
  const keyed = trades.map((t) => ({
    derived: t.derived,
    entryTime: t.row.entryTime,
  }));
  const dow = byDayOfWeek(keyed);
  const hours = byHour(keyed);
  const byAsset = byKey(
    trades.map((t) => ({
      derived: t.derived,
      entryTime: t.row.entryTime,
      key: t.row.asset.symbol,
    })),
  );
  const byStrategy = byKey(
    trades.map((t) => ({
      derived: t.derived,
      entryTime: t.row.entryTime,
      key: t.row.strategy?.name ?? "Unspecified",
    })),
  );

  // P/L distribution buckets
  const closedPLs = derivedList.filter((d) => d.isClosed).map((d) => d.netPL);
  const dist = buildDistribution(closedPLs);

  const maxHourTrades = Math.max(...hours.map((h) => h.trades), 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Your trading performance at a glance." />

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Metric label="Total trades" value={String(summary.totalTrades)} />
        <Metric
          label="Total net P/L"
          value={formatCurrency(summary.totalNetPL, currency)}
          className={plClass(summary.totalNetPL)}
        />
        <Metric
          label="Win rate"
          value={formatPct(summary.winRate)}
          className={summary.winRate >= 50 ? "text-positive" : undefined}
        />
        <Metric label="Max drawdown" value={formatPct(dd.maxDrawdownPct)} />
        <Metric label="Avg actual RRR" value={formatNumber(summary.avgActualRRR)} />
        <Metric
          label="Profit factor"
          value={summary.profitFactor === Infinity ? "∞" : formatNumber(summary.profitFactor)}
        />
      </div>

      {/* Equity curve */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Equity curve</h2>
        {curve.length > 0 ? (
          <EquityChart
            data={curve.map((p) => ({
              label: p.time.toLocaleDateString(),
              equity: Number(p.equity.toFixed(2)),
            }))}
          />
        ) : (
          <p className="text-sm text-muted">Close some trades to see your equity curve.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">P/L distribution</h2>
          <SignedBarChart data={dist} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Day-of-week win rate</h2>
          <BarChartSimple
            data={dow.map((d) => ({ label: d.key.slice(0, 3), value: Number(d.winRate.toFixed(1)) }))}
          />
        </Card>
      </div>

      {/* Performance snapshot table */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Performance snapshot</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
          <Row label="Expectancy" value={formatCurrency(summary.expectancy, currency)} sign={summary.expectancy} />
          <Row label="W/L ratio" value={summary.wlRatio === Infinity ? "∞" : formatNumber(summary.wlRatio)} />
          <Row label="Avg planned RRR" value={formatNumber(summary.avgPlannedRRR)} />
          <Row label="Average profit" value={formatCurrency(summary.avgProfit, currency)} sign={1} />
          <Row label="Average loss" value={formatCurrency(summary.avgLoss, currency)} sign={-1} />
          <Row label="Average net P/L" value={formatCurrency(summary.avgNetPL, currency)} sign={summary.avgNetPL} />
          <Row label="Best trade" value={formatCurrency(summary.bestTrade, currency)} sign={1} />
          <Row label="Worst trade" value={formatCurrency(summary.worstTrade, currency)} sign={-1} />
          <Row label="Total win" value={formatCurrency(summary.totalWin, currency)} sign={1} />
          <Row label="Total loss" value={formatCurrency(summary.totalLoss, currency)} sign={-1} />
          <Row label="Wins / Losses / Even" value={`${summary.wins} / ${summary.losses} / ${summary.evens}`} />
          <Row label="Closed trades" value={String(summary.closedTrades)} />
        </div>
      </Card>

      {/* Asset & strategy breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Net P/L by asset</h2>
          <SignedBarChart
            data={byAsset.map((g) => ({ label: g.key, value: Number(g.netPL.toFixed(2)) }))}
          />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Net P/L by strategy</h2>
          <SignedBarChart
            data={byStrategy.map((g) => ({ label: g.key, value: Number(g.netPL.toFixed(2)) }))}
          />
        </Card>
      </div>

      {/* Hour-of-day heatmap */}
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Hour-of-day activity</h2>
        <p className="mb-4 text-xs text-muted">
          Cell shade = trade count; number = net P/L. Based on entry hour (local time).
        </p>
        <div className="grid grid-cols-12 gap-1">
          {hours.map((h) => {
            const intensity = h.trades / maxHourTrades;
            return (
              <div
                key={h.key}
                title={`${h.key}:00 — ${h.trades} trades, ${formatCurrency(h.netPL, currency)}`}
                className="rounded-md border p-1.5 text-center"
                style={{
                  background:
                    h.trades === 0
                      ? "transparent"
                      : `color-mix(in srgb, var(--primary) ${Math.round(20 + intensity * 70)}%, transparent)`,
                }}
              >
                <div className="text-[10px] text-muted">{h.key}</div>
                <div className={cn("text-[10px] font-medium", h.netPL !== 0 && plClass(h.netPL))}>
                  {h.trades > 0 ? formatNumber(h.netPL, 0) : "·"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Duration */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Metric label="Avg trade duration" value={formatDuration(avgDuration(derivedList))} />
        <Metric
          label="Avg win duration"
          value={formatDuration(avgDuration(derivedList.filter((d) => d.outcome === "WIN")))}
        />
        <Metric
          label="Avg loss duration"
          value={formatDuration(avgDuration(derivedList.filter((d) => d.outcome === "LOSS")))}
        />
      </div>
    </div>
  );
}

function avgDuration(list: { durationMin: number | null }[]): number | null {
  const ds = list.map((d) => d.durationMin).filter((d): d is number => d != null);
  if (!ds.length) return null;
  return ds.reduce((s, d) => s + d, 0) / ds.length;
}

function buildDistribution(pls: number[]): { label: string; value: number }[] {
  if (pls.length === 0) return [];
  // Bucket net P/L into bins and show trade counts per bin (signed colour).
  const max = Math.max(...pls.map(Math.abs), 1);
  const bins = [
    { label: `< -${(max * 0.66).toFixed(0)}`, min: -Infinity, max: -max * 0.66, count: 0 },
    { label: "big loss", min: -max * 0.66, max: -max * 0.33, count: 0 },
    { label: "small loss", min: -max * 0.33, max: 0, count: 0 },
    { label: "small win", min: 0, max: max * 0.33, count: 0 },
    { label: "win", min: max * 0.33, max: max * 0.66, count: 0 },
    { label: "big win", min: max * 0.66, max: Infinity, count: 0 },
  ];
  for (const pl of pls) {
    const bin = bins.find((b) => pl > b.min && pl <= b.max) ?? bins[bins.length - 1];
    bin.count += 1;
  }
  return bins.map((b) => ({
    label: b.label,
    // signed so losses render red, wins green
    value: b.max <= 0 ? -b.count : b.count,
  }));
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
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold", className)}>{value}</p>
    </Card>
  );
}

function Row({
  label,
  value,
  sign,
}: {
  label: string;
  value: string;
  sign?: number;
}) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5">
      <span className="text-muted">{label}</span>
      <span className={cn("font-medium", sign !== undefined && plClass(sign))}>{value}</span>
    </div>
  );
}