import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTrades, type TradeFilters } from "@/lib/trades";
import { PageHeader, Button, Card, Input, Select } from "@/components/ui";
import { TradeWorkbench } from "@/components/trade-workbench";
import { Plus, Upload } from "lucide-react";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: TradeFilters = {
    accountId: sp.account || undefined,
    assetId: sp.asset || undefined,
    strategyId: sp.strategy || undefined,
    status: sp.status || undefined,
    review: sp.review === "pending",
    from: sp.from,
    to: sp.to,
    exitDate: sp.exitDate,
  };

  const [trades, accounts, assets, strategies] = await Promise.all([
    getTrades(filters),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.findMany({ orderBy: { symbol: "asc" } }),
    prisma.strategy.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Trading Log"
        description="Where your trades tell their story."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/trades/import">
              <Button variant="secondary">
                <Upload size={16} /> Import CSV
              </Button>
            </Link>
            <Link href="/trades/new">
              <Button>
                <Plus size={16} /> New trade
              </Button>
            </Link>
          </div>
        }
      />

      {sp.error === "invalid-images" && (
        <p role="alert" className="mb-4 text-negative">
          Trade not saved. Screenshots must be PNG, JPEG, or WebP, up to 4 MB
          per entry or exit section.
        </p>
      )}
      {sp.error === "invalid-leverage" && (
        <p role="alert" className="mb-4 text-negative">
          Trade not saved. Leverage must be a finite number of at least 1×.
        </p>
      )}
      {sp.imported && (
        <div className="mb-4 rounded-[var(--radius)] border border-positive/40 bg-positive/10 px-4 py-2.5 text-sm text-positive">
          Imported {sp.imported} {sp.imported === "1" ? "trade" : "trades"}{" "}
          successfully.
        </div>
      )}

      <div className="mb-5 flex gap-2 border-b pb-3">
        {[
          { label: "All trades", status: "", review: "" },
          { label: "Open positions", status: "OPEN", review: "" },
          { label: "Closed", status: "CLOSED", review: "" },
          { label: "To review", status: "CLOSED", review: "pending" },
        ].map((tab) => {
          const query = new URLSearchParams(
            Object.entries(sp).filter(
              (item): item is [string, string] => typeof item[1] === "string",
            ),
          );
          query.delete("selected");
          query.set("status", tab.status);
          query.set("review", tab.review);
          const active =
            (sp.status ?? "") === tab.status &&
            (sp.review ?? "") === tab.review;
          return (
            <Link
              key={tab.label}
              href={`/trades?${query}`}
              className={`rounded-lg px-4 py-2 text-sm ${active ? "bg-primary text-white" : "text-muted hover:bg-surface-2"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Card className="mb-4 p-3">
        <form className="grid grid-cols-2 gap-3 md:grid-cols-5" method="get">
          <input type="hidden" name="review" value={sp.review ?? ""} />
          <input type="hidden" name="exitDate" value={sp.exitDate ?? ""} />
          <FieldFilter name="from" label="Entry from (UTC)" value={sp.from} />
          <FieldFilter name="to" label="Entry to (UTC)" value={sp.to} />
          <Select
            aria-label="Account filter"
            name="account"
            defaultValue={sp.account ?? ""}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select name="asset" defaultValue={sp.asset ?? ""}>
            <option value="">All assets</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.symbol}
              </option>
            ))}
          </Select>
          <Select name="strategy" defaultValue={sp.strategy ?? ""}>
            <option value="">All strategies</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={sp.status ?? ""}>
            <option value="">Any status</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </Card>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Matching trades", value: trades.length },
          {
            label: "Open positions",
            value: trades.filter((t) => !t.derived.isClosed).length,
          },
          {
            label: "Closed trades",
            value: trades.filter((t) => t.derived.isClosed).length,
          },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs text-muted">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
          </Card>
        ))}
      </div>
      <TradeWorkbench
        initialId={sp.selected}
        trades={trades.map(({ row, derived }) => ({
          id: row.id,
          symbol: row.asset.symbol,
          account: row.account.name,
          currency: row.account.currency,
          direction: row.direction,
          status: row.status,
          entryTime: row.entryTime.toISOString(),
          entryPrice: Number(row.entryPrice),
          size: Number(row.size),
          netPL: derived.netPL,
          strategy: row.strategy?.name ?? "No strategy",
          notes: row.notes ?? "",
          confidence: row.confidence,
          discipline: row.discipline,
          reviewed: row.reviewedAt != null,
          leverage: row.leverage,
          margin: (Number(row.size) * Number(row.entryPrice)) / row.leverage,
        }))}
      />
    </div>
  );
}

function FieldFilter({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value?: string;
}) {
  return (
    <label className="text-xs text-muted">
      {label}
      <Input
        aria-label={label}
        type="date"
        name={name}
        defaultValue={value ?? ""}
      />
    </label>
  );
}
