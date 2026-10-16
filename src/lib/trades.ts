import { validDay } from "./workspace";
import { prisma } from "@/lib/db";
import { num } from "@/lib/money";
import {
  deriveTrade,
  type DerivedTrade,
  type TradeInput,
} from "@/lib/analytics";

// Shape of a Prisma trade row with the relations we display.
type TradeRow = Awaited<ReturnType<typeof fetchTradeRows>>[number];

function fetchTradeRows(where: Record<string, unknown>) {
  return prisma.trade.findMany({
    where,
    orderBy: { entryTime: "desc" },
    include: {
      account: true,
      asset: true,
      strategy: true,
      emotion: true,
    },
  });
}

/** Map a Prisma row (Decimal fields) into the plain TradeInput the analytics use. */
export function toTradeInput(t: {
  direction: string;
  size: unknown;
  entryTime: Date;
  entryPrice: unknown;
  stopLoss: unknown;
  takeProfit: unknown;
  exitTime: Date | null;
  exitPrice: unknown;
  fees: unknown;
  exitFees?: unknown;
  status: string;
}): TradeInput {
  return {
    direction: t.direction === "SHORT" ? "SHORT" : "LONG",
    size: num(t.size as never),
    entryTime: t.entryTime,
    entryPrice: num(t.entryPrice as never),
    stopLoss: t.stopLoss != null ? num(t.stopLoss as never) : null,
    takeProfit: t.takeProfit != null ? num(t.takeProfit as never) : null,
    exitTime: t.exitTime,
    exitPrice: t.exitPrice != null ? num(t.exitPrice as never) : null,
    fees: num(t.fees as never),
    exitFees: num(t.exitFees as never),
    status: t.status === "CLOSED" ? "CLOSED" : "OPEN",
  };
}

export interface TradeWithDerived {
  row: TradeRow;
  derived: DerivedTrade;
}

export interface TradeFilters {
  accountId?: string;
  assetId?: string;
  strategyId?: string;
  status?: string;
  review?: boolean;
  trash?: boolean;
  search?: string;
  from?: string;
  to?: string;
  exitDate?: string;
}

/** Option lists for the trade form selects. */
export async function getFormOptions() {
  const [accounts, assets, strategies, emotions, mistakes] = await Promise.all([
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.findMany({ orderBy: { symbol: "asc" } }),
    prisma.strategy.findMany({ orderBy: { name: "asc" } }),
    prisma.emotion.findMany({ orderBy: { score: "desc" } }),
    prisma.mistake.findMany({ orderBy: { name: "asc" } }),
  ]);
  return {
    accounts: accounts.map((a) => ({ id: a.id, label: a.name })),
    assets: assets.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      assetClass: a.assetClass,
      accountId: a.accountId,
      label: `${a.symbol} (${a.assetClass})`,
    })),
    strategies: strategies.map((s) => ({ id: s.id, label: s.name })),
    emotions: emotions.map((e) => ({ id: e.id, label: e.name })),
    mistakes: mistakes.map((m) => ({ id: m.id, label: m.name })),
  };
}

export async function getTrades(
  filters: TradeFilters = {},
): Promise<TradeWithDerived[]> {
  const where: Record<string, unknown> = {
    deletedAt: filters.trash ? { not: null } : null,
  };
  if (filters.search?.trim())
    where.asset = { symbol: { contains: filters.search.trim() } };
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.strategyId) where.strategyId = filters.strategyId;
  if (filters.status === "OPEN" || filters.status === "CLOSED")
    where.status = filters.status;
  if (filters.review) {
    where.status = "CLOSED";
    where.reviewedAt = null;
  }
  if (validDay(filters.from) || validDay(filters.to))
    where.entryTime = {
      ...(validDay(filters.from)
        ? { gte: new Date(filters.from! + "T00:00:00Z") }
        : {}),
      ...(validDay(filters.to)
        ? { lt: new Date(Date.parse(filters.to! + "T00:00:00Z") + 86400000) }
        : {}),
    };
  if (validDay(filters.exitDate))
    where.exitTime = {
      gte: new Date(filters.exitDate! + "T00:00:00Z"),
      lt: new Date(Date.parse(filters.exitDate! + "T00:00:00Z") + 86400000),
    };

  const rows = await fetchTradeRows(where);
  return rows.map((row) => ({ row, derived: deriveTrade(toTradeInput(row)) }));
}
