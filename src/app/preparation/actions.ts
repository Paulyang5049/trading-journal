"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

function opt(form: FormData, key: string): string | null {
  const v = String(form.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function createWatchlistItem(form: FormData) {
  const symbol = String(form.get("symbol") ?? "").trim();
  if (!symbol) return;
  const priceRaw = form.get("currentPrice");
  const price = priceRaw != null && priceRaw !== "" ? Number(priceRaw) : null;
  await prisma.watchlistItem.create({
    data: {
      symbol: symbol.toUpperCase(),
      currentPrice: price != null && Number.isFinite(price) ? price : null,
      goal: opt(form, "goal"),
      technicals: opt(form, "technicals"),
      fundamentals: opt(form, "fundamentals"),
      news: opt(form, "news"),
      source: opt(form, "source"),
      riskReward: opt(form, "riskReward"),
      notes: opt(form, "notes"),
    },
  });
  revalidatePath("/preparation");
}

export async function deleteWatchlistItem(form: FormData) {
  await prisma.watchlistItem.delete({ where: { id: String(form.get("id") ?? "") } });
  revalidatePath("/preparation");
}
