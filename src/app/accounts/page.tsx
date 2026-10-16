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
import { AccountComparisonChart, EquityChart } from "@/components/charts";
import { Trash2 } from "lucide-react";
import {
  addCapitalEvent,
  deleteCapitalEvent,
  transferCapital,
} from "./actions";

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

  if (sp.account === "all") {
    const [events, trades] = await Promise.all([
      prisma.capitalEvent.findMany({ orderBy: { datetime: "asc" } }),
      getTrades(),
    ]);
    const curves = accounts.map((account) => ({
      ...account,
      points: buildEquityCurve({
        startingCapital: 0,
        capitalEvents: events
          .filter((e) => e.accountId === account.id)
          .map((e) => ({ time: e.datetime, amount: num(e.amount) })),
        closedTrades: trades
          .filter(
            (t) =>
              t.row.accountId === account.id &&
              t.derived.isClosed &&
              t.row.exitTime,
          )
          .map((t) => ({ time: t.row.exitTime!, netPL: t.derived.netPL })),
      }),
    }));
    return (
      <div className="space-y-6">
        <PageHeader
          title="Account Capital"
          description="Compare account equity, including deposits, withdrawals, and transfers."
          actions={
            <form method="get" className="flex gap-2">
              <Select
                aria-label="Account"
                name="account"
                defaultValue="all"
                className="w-48"
              >
                <option value="all">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="secondary">
                View account
              </Button>
            </form>
          }
        />
        {[...new Set(accounts.map((a) => a.currency))].map((currency) => {
          const group = curves.filter((a) => a.currency === currency);
          const times = [
            ...new Set(
              group.flatMap((a) => a.points.map((p) => p.time.getTime())),
            ),
          ].sort((a, b) => a - b);
          const data = times.map((time) => {
            const row: { time: number; [key: string]: number } = { time };
            for (const a of group)
              row[a.id] =
                a.points.findLast((p) => p.time.getTime() <= time)?.equity ?? 0;
            return row;
          });
          return (
            <Card key={currency}>
              <h2 className="mb-4 text-lg font-semibold">
                All accounts · Equity ({currency})
              </h2>
              {data.length ? (
                <AccountComparisonChart
                  data={data}
                  accounts={group.map((a) => ({ id: a.id, name: a.name }))}
                />
              ) : (
                <p className="text-sm text-muted">
                  No capital events or closed trades yet.
                </p>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((a) => (
                  <Link
                    key={a.id}
                    href={`/accounts?account=${a.id}`}
                    className="rounded-lg border p-3 hover:bg-surface-2"
                  >
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatCurrency(a.points.at(-1)?.equity ?? 0, currency)}
                    </p>
                    <p className="text-xs text-muted">
                      {a.points.length
                        ? "Current equity · View account →"
                        : "No activity yet · View account →"}
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
        <p className="text-sm text-muted">
          Select an individual account to add capital events or record a
          transfer. Different currencies are shown on separate charts.
        </p>
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
    capitalEvents: events.map((e) => ({
      time: e.datetime,
      amount: num(e.amount),
    })),
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
          <form method="get" className="flex gap-2">
            <Select
              aria-label="Account"
              name="account"
              defaultValue={account.id}
              className="w-48"
            >
              <option value="all">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              View account
            </Button>
          </form>
        }
      />

      {sp.error === "transfer" && (
        <p role="alert" className="text-negative">
          Transfer not saved. Choose two different accounts and enter positive
          amounts and a valid date. Cross-currency transfers require the amount
          received.
        </p>
      )}
      {sp.transferred && (
        <p role="status" className="text-positive">
          Transfer recorded in both accounts.
        </p>
      )}
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
        <h2 className="mb-4 text-lg font-semibold">
          Equity curve · {account.name} ({account.currency})
        </h2>
        {curve.length > 0 ? (
          <EquityChart
            seriesName={`${account.name} (${account.currency})`}
            data={curve.map((p) => ({
              label: p.time.toLocaleDateString(),
              equity: Number(p.equity.toFixed(2)),
            }))}
          />
        ) : (
          <p className="text-sm text-muted">
            No capital events or closed trades yet.
          </p>
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
        <h2 className="mb-2 text-lg font-semibold">
          Transfer to another account
        </h2>
        <p className="mb-4 text-sm text-muted">
          From {account.name} ({account.currency}). Transfers record an outgoing
          and incoming amount together. For different currencies, enter the
          actual amount received.
        </p>
        {accounts.length < 2 ? (
          <p className="text-sm text-muted">
            Add another account in Settings to record a transfer.
          </p>
        ) : (
          <form
            action={transferCapital}
            className="grid grid-cols-2 gap-3 md:grid-cols-3 md:items-end"
          >
            <input type="hidden" name="accountId" value={account.id} />
            <Field label="To account">
              <Select aria-label="To account" name="destinationId" required>
                {accounts
                  .filter((a) => a.id !== account.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={`Amount sent (${account.currency})`}>
              <Input
                aria-label="Amount sent"
                name="amount"
                type="number"
                min="0.00000001"
                step="any"
                required
              />
            </Field>
            <Field
              label="Amount received"
              hint="Required only for a different currency; use the destination currency."
            >
              <Input
                name="receivedAmount"
                type="number"
                min="0.00000001"
                step="any"
              />
            </Field>
            <Field label="Date">
              <Input name="datetime" type="datetime-local" />
            </Field>
            <Field label="Note">
              <Input name="note" placeholder="Optional" />
            </Field>
            <Button type="submit">Record transfer</Button>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Capital history · {account.name}
        </h2>
        <p className="mb-3 text-xs text-muted">
          Deleting a transfer removes both linked entries.
        </p>
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
                  <Td
                    className={`text-right font-medium ${plClass(num(e.amount))}`}
                  >
                    {formatCurrency(num(e.amount), account.currency)}
                  </Td>
                  <Td className="text-muted">{e.note}</Td>
                  <Td className="text-right">
                    <form action={deleteCapitalEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        aria-label={
                          e.transferId
                            ? "Delete transfer from both accounts"
                            : "delete"
                        }
                        className="text-muted hover:text-negative"
                      >
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
