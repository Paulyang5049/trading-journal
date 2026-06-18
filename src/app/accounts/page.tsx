import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTrades } from "@/lib/trades";
import { buildEquityCurve, maxDrawdown } from "@/lib/analytics";
import { formatCurrency, formatPct, num } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Field,
  Table,
  Th,
  Td,
  EmptyState,
  plClass,
} from "@/components/ui";
import { EquityChart } from "@/components/charts";
import { Trash2 } from "lucide-react";
import { addCapitalEvent, deleteCapitalEvent } from "./actions";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader title="Account Capital" />
        <EmptyState
          title="No accounts yet"
          description="Create an account in setup to track capital."
          action={
            <Link href="/settings">
              <Button>Go to setup</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const account = accounts.find((a) => a.id === sp.account) ?? accounts[0];
  const [events, trades] = await Promise.all([
    prisma.capitalEvent.findMany({
      where: { accountId: account.id },
      orderBy: { datetime: "asc" },
    }),
    getTrades({ accountId: account.id }),
  ]);

  const curve = buildEquityCurve({
    startingCapital: 0,
    capitalEvents: events.map((e) => ({ time: e.datetime, amount: num(e.amount) })),
    closedTrades: trades
      .filter((t) => t.derived.isClosed && t.row.exitTime)
      .map((t) => ({ time: t.row.exitTime as Date, netPL: t.derived.netPL })),
  });

  const equity = curve.length ? curve[curve.length - 1].equity : 0;
  const deposited = events
    .filter((e) => num(e.amount) > 0)
    .reduce((s, e) => s + num(e.amount), 0);
  const realizedPL = trades
    .filter((t) => t.derived.isClosed)
    .reduce((s, t) => s + t.derived.netPL, 0);
  const dd = maxDrawdown(curve.map((p) => p.equity));
  const growthPct = deposited > 0 ? (realizedPL / deposited) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Capital"
        description="Where your money moves and grows."
        actions={
          <form method="get">
            <Select name="account" defaultValue={account.id} className="w-48">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Equity" value={formatCurrency(equity, account.currency)} />
        <Stat
          label="Realized P/L"
          value={formatCurrency(realizedPL, account.currency)}
          className={plClass(realizedPL)}
        />
        <Stat
          label="Capital growth"
          value={formatPct(growthPct)}
          className={plClass(growthPct)}
        />
        <Stat label="Max drawdown" value={formatPct(dd.maxDrawdownPct)} />
      </div>

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
          <p className="text-sm text-muted">No capital events or closed trades yet.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Add capital event</h2>
        <form
          action={addCapitalEvent}
          className="grid grid-cols-2 gap-3 md:grid-cols-5 md:items-end"
        >
          <input type="hidden" name="accountId" value={account.id} />
          <Field label="Type">
            <Select name="type" defaultValue="deposit">
              <option value="deposit">Deposit</option>
              <option value="withdraw">Withdraw</option>
              <option value="adjustment">Adjustment</option>
            </Select>
          </Field>
          <Field label="Amount">
            <Input name="amount" type="number" step="0.01" required />
          </Field>
          <Field label="Date">
            <Input name="datetime" type="datetime-local" />
          </Field>
          <Field label="Note">
            <Input name="note" placeholder="Optional" />
          </Field>
          <Button type="submit">Add</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Capital history</h2>
        {events.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th className="text-right">Amount</Th>
                <Th>Note</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <Td>{formatDateTime(e.datetime)}</Td>
                  <Td className="capitalize">{e.type}</Td>
                  <Td className={`text-right font-medium ${plClass(num(e.amount))}`}>
                    {formatCurrency(num(e.amount), account.currency)}
                  </Td>
                  <Td className="text-muted">{e.note}</Td>
                  <Td className="text-right">
                    <form action={deleteCapitalEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <button aria-label="delete" className="text-muted hover:text-negative">
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-muted">No capital events yet.</p>
        )}
      </Card>
    </div>
  );
}

function Stat({
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
      <p className={`mt-1 text-xl font-semibold ${className ?? ""}`}>{value}</p>
    </Card>
  );
}
