import { prisma } from "./db";
import { getTrades } from "./trades";
import { dec, num } from "./money";

// Realized equity only: no live prices or unrealized P/L are available.
export async function accountBalances() {
  const [accounts, events, trades] = await Promise.all([
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.capitalEvent.findMany(),
    getTrades(),
  ]);
  return accounts.map((a) => ({
    id: a.id,
    label: a.name,
    assetClass: a.assetClass,
    currency: a.currency,
    equity: events
      .filter((e) => e.accountId === a.id)
      .reduce((s, e) => s.plus(num(e.amount)), dec(0))
      .plus(
        trades
          .filter((t) => t.row.accountId === a.id && t.derived.isClosed)
          .reduce((s, t) => s.plus(t.derived.netPL), dec(0)),
      )
      .toNumber(),
  }));
}
