import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTrades, type TradeFilters } from "@/lib/trades";
import { formatCurrency, formatNumber } from "@/lib/money";
import { formatDateTime, formatDuration } from "@/lib/format";
import {
  PageHeader,
  Button,
  Card,
  Table,
  Th,
  Td,
  Badge,
  EmptyState,
  Select,
  plClass,
} from "@/components/ui";
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

      {sp.imported && (
        <div className="mb-4 rounded-[var(--radius)] border border-positive/40 bg-positive/10 px-4 py-2.5 text-sm text-positive">
          Imported {sp.imported} {sp.imported === "1" ? "trade" : "trades"} successfully.
        </div>
      )}

      <Card className="mb-4 p-3">
        <form className="grid grid-cols-2 gap-3 md:grid-cols-5" method="get">
          <Select name="account" defaultValue={sp.account ?? ""}>
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

      {trades.length === 0 ? (
        <EmptyState
          title="No trades yet"
          description="Log your first trade to start building your journal."
          action={
            <Link href="/trades/new">
              <Button>New trade</Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Entry</Th>
              <Th>Asset</Th>
              <Th>Dir</Th>
              <Th>Size</Th>
              <Th>Entry / Exit</Th>
              <Th>Status</Th>
              <Th className="text-right">Net P/L</Th>
              <Th className="text-right">RRR</Th>
              <Th>Duration</Th>
            </tr>
          </thead>
          <tbody>
            {trades.map(({ row, derived }) => {
              const currency = row.account.currency;
              return (
                <tr key={row.id} className="hover:bg-surface-2">
                  <Td>
                    <Link href={`/trades/${row.id}`} className="hover:text-primary">
                      {formatDateTime(row.entryTime)}
                    </Link>
                  </Td>
                  <Td className="font-medium">{row.asset.symbol}</Td>
                  <Td>
                    <Badge
                      className={
                        row.direction === "LONG"
                          ? "border-positive text-positive"
                          : "border-negative text-negative"
                      }
                    >
                      {row.direction}
                    </Badge>
                  </Td>
                  <Td>{formatNumber(Number(row.size), 4)}</Td>
                  <Td className="text-muted">
                    {formatNumber(Number(row.entryPrice), 4)}
                    {row.exitPrice != null
                      ? ` → ${formatNumber(Number(row.exitPrice), 4)}`
                      : ""}
                  </Td>
                  <Td>
                    {row.status === "CLOSED" ? (
                      <span className="text-muted">Closed</span>
                    ) : (
                      <Badge className="border-warning text-warning">Open</Badge>
                    )}
                  </Td>
                  <Td className={`text-right font-medium ${plClass(derived.netPL)}`}>
                    {derived.isClosed ? formatCurrency(derived.netPL, currency) : "—"}
                  </Td>
                  <Td className="text-right">
                    {derived.actualRRR != null ? formatNumber(derived.actualRRR) : "—"}
                  </Td>
                  <Td className="text-muted">{formatDuration(derived.durationMin)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
