import { SavedTradeFilters } from "@/components/saved-trade-filters";
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
    trash: sp.trash === "1",
    search: sp.q,
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
        description="Track your positions. Review your decisions. Refine your edge."
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

      {sp.error === "invalid-symbol" && (
        <p role="alert" className="mb-4 text-negative">
          Enter a valid symbol (up to 64 letters, numbers or . _ : / -) and
          asset class.
        </p>
      )}
      {sp.error === "invalid-size" && (
        <p role="alert" className="mb-4 text-negative">
          Trade not saved. Enter a positive cost, entry price and valid
          leverage, or a positive size.
        </p>
      )}
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

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border bg-surface p-1.5">
        {[
          { label: "All trades", status: "", review: "" },
          { label: "Open positions", status: "OPEN", review: "" },
          { label: "Closed", status: "CLOSED", review: "" },
          { label: "To review", status: "CLOSED", review: "pending" },
          { label: "Trash", status: "", review: "", trash: true },
        ].map((tab) => {
          const query = new URLSearchParams(
            Object.entries(sp).filter(
              (item): item is [string, string] => typeof item[1] === "string",
            ),
          );
          query.delete("selected");
          query.delete("trash");
          if (tab.trash) query.set("trash", "1");
          query.set("status", tab.status);
          query.set("review", tab.review);
          const active =
            (sp.trash === "1") === !!tab.trash &&
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
      <Card className="mb-4">
        <form
          key={JSON.stringify(sp)}
          className="grid grid-cols-2 items-end gap-3 lg:grid-cols-5"
          method="get"
        >
          <input type="hidden" name="trash" value={sp.trash ?? ""} />
          <label className="col-span-2 text-xs font-medium text-muted lg:col-span-5">
            Search symbols
            <Input
              type="search"
              name="q"
              placeholder="Search BTC, ETH, EURUSD…"
              defaultValue={sp.q ?? ""}
              className="mt-1"
            />
          </label>
          <input type="hidden" name="review" value={sp.review ?? ""} />
          <input type="hidden" name="exitDate" value={sp.exitDate ?? ""} />
          <details
            className="col-span-2 rounded-xl border bg-surface-2/30 p-3 lg:col-span-5"
            open={
              !!(
                sp.account ||
                sp.asset ||
                sp.strategy ||
                sp.from ||
                sp.to ||
                sp.status
              )
            }
          >
            <summary className="cursor-pointer text-xs font-medium text-muted">
              Account, date & strategy filters
            </summary>
            <div className="mt-3 grid grid-cols-2 items-end gap-3 lg:grid-cols-5">
              <FieldFilter
                name="from"
                label="Entry from (UTC)"
                value={sp.from}
              />
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
              <Select
                aria-label="Asset filter"
                name="asset"
                defaultValue={sp.asset ?? ""}
              >
                <option value="">All assets</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.symbol}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Strategy filter"
                name="strategy"
                defaultValue={sp.strategy ?? ""}
              >
                <option value="">All strategies</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Status filter"
                name="status"
                defaultValue={sp.status ?? ""}
              >
                <option value="">Any status</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </Select>
            </div>
          </details>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <Link
            href="/trades"
            className="py-2 text-sm text-muted hover:text-primary"
          >
            Clear filters
          </Link>
        </form>
        <SavedTradeFilters
          query={new URLSearchParams(
            Object.entries(sp).filter(
              (p): p is [string, string] => typeof p[1] === "string",
            ),
          ).toString()}
        />
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
      {sp.trash === "1" && (
        <p className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          Trades in Trash are excluded from performance and account equity.
          Restore brings back the trade, screenshots and review.
        </p>
      )}
      <TradeWorkbench
        initialId={sp.selected}
        trades={trades.map(({ row, derived }) => ({
          id: row.id,
          deleted: row.deletedAt != null,
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
