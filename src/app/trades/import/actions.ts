"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseTradesCsv } from "@/lib/import/parse";

/**
 * Import trades from raw CSV text. The CSV is re-parsed server-side (the
 * authoritative source), assets/strategies are resolved or created by name
 * within the chosen account, and all trades are inserted in one transaction.
 */
export async function importTrades(form: FormData) {
  const accountId = String(form.get("accountId") ?? "");
  const csv = String(form.get("csv") ?? "");
  if (!accountId || !csv.trim()) return;

  const { rows } = parseTradesCsv(
    csv,
    String(form.get("bybitOffset") ?? "+00:00"),
  );
  if (rows.length === 0) {
    redirect(`/trades/import?error=norows`);
  }

  // Resolve assets by symbol within this account (create missing ones).
  const symbols = [...new Set(rows.map((r) => r.symbol))];
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  const assetIdBySymbol = new Map<string, string>();
  for (const symbol of symbols) {
    const existing = await prisma.asset.findFirst({
      where: { symbol, accountId },
    });
    if (existing) {
      assetIdBySymbol.set(symbol, existing.id);
    } else {
      const created = await prisma.asset.create({
        data: { symbol, accountId, assetClass: account?.assetClass ?? "Forex" },
      });
      assetIdBySymbol.set(symbol, created.id);
    }
  }

  // Resolve strategies by name (create missing ones).
  const strategyNames = [
    ...new Set(rows.map((r) => r.strategy).filter(Boolean)),
  ] as string[];
  const strategyIdByName = new Map<string, string>();
  for (const name of strategyNames) {
    const strat = await prisma.strategy.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    strategyIdByName.set(name, strat.id);
  }

  const imported = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const r of rows) {
      if (
        r.sourceId &&
        (await tx.trade.findFirst({
          where: { accountId, notes: { contains: `[${r.sourceId}]` } },
        }))
      )
        continue;
      await tx.trade.create({
        data: {
          accountId,
          assetId: assetIdBySymbol.get(r.symbol)!,
          strategyId: r.strategy ? strategyIdByName.get(r.strategy) : null,
          direction: r.direction,
          size: r.size,
          entryTime: r.entryTime,
          entryPrice: r.entryPrice,
          stopLoss: r.stopLoss,
          takeProfit: r.takeProfit,
          exitTime: r.exitTime,
          exitPrice: r.exitPrice,
          fees: r.fees,
          notes: r.notes,
          status: r.exitPrice != null ? "CLOSED" : "OPEN",
        },
      });
      count++;
    }
    return count;
  });

  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/accounts");
  redirect(`/trades?imported=${imported}`);
}
