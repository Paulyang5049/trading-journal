"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const ASSET_CLASSES = ["Forex", "Stocks", "Crypto", "Futures", "Other"];

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function optStr(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}
function numOr(form: FormData, key: string, fallback = 0): number {
  const v = Number(form.get(key));
  return Number.isFinite(v) ? v : fallback;
}

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/trades");
  revalidatePath("/accounts");
}

// ---- Accounts ----
export async function createAccount(form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  const cls = ASSET_CLASSES.includes(str(form, "assetClass"))
    ? str(form, "assetClass")
    : "Forex";
  const starting = numOr(form, "startingCapital");
  await prisma.account.create({
    data: {
      name,
      assetClass: cls,
      currency: str(form, "currency") || "USD",
      startingCapital: starting,
      notes: optStr(form, "notes"),
      capitalEvents:
        starting !== 0
          ? { create: { type: "deposit", amount: starting, note: "Initial capital" } }
          : undefined,
    },
  });
  revalidateAll();
}

export async function deleteAccount(form: FormData) {
  await prisma.account.delete({ where: { id: str(form, "id") } });
  revalidateAll();
}

// ---- Assets ----
export async function createAsset(form: FormData) {
  const symbol = str(form, "symbol");
  if (!symbol) return;
  await prisma.asset.create({
    data: {
      symbol: symbol.toUpperCase(),
      assetClass: ASSET_CLASSES.includes(str(form, "assetClass"))
        ? str(form, "assetClass")
        : "Forex",
      accountId: optStr(form, "accountId"),
    },
  });
  revalidateAll();
}

export async function deleteAsset(form: FormData) {
  const id = str(form, "id");
  if (!id) return;
  // Keep the usage check in the delete itself, including for stale browser tabs.
  const result = await prisma.asset.deleteMany({
    where: { id, trades: { none: {} } },
  });
  revalidateAll();
  if (result.count === 0) {
    redirect("/settings?notice=asset-not-deleted#assets");
  }
}

// ---- Strategies ----
export async function createStrategy(form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  await prisma.strategy.create({
    data: { name, description: optStr(form, "description") },
  });
  revalidateAll();
}

export async function deleteStrategy(form: FormData) {
  await prisma.strategy.delete({ where: { id: str(form, "id") } });
  revalidateAll();
}

// ---- Emotions ----
export async function createEmotion(form: FormData) {
  const name = str(form, "name");
  if (!name) return;
  await prisma.emotion.create({
    data: {
      name,
      score: Math.max(-5, Math.min(5, numOr(form, "score"))),
      explanation: optStr(form, "explanation"),
    },
  });
  revalidateAll();
}

export async function deleteEmotion(form: FormData) {
  await prisma.emotion.delete({ where: { id: str(form, "id") } });
  revalidateAll();
}

// ---- Goals / global settings ----
export async function updateSettings(form: FormData) {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      currency: str(form, "currency") || "USD",
      maxDrawdownPct: numOr(form, "maxDrawdownPct", 10),
      profitTargetPct: numOr(form, "profitTargetPct", 20),
      winRatePct: numOr(form, "winRatePct", 50),
    },
    create: {
      id: 1,
      currency: str(form, "currency") || "USD",
      maxDrawdownPct: numOr(form, "maxDrawdownPct", 10),
      profitTargetPct: numOr(form, "profitTargetPct", 20),
      winRatePct: numOr(form, "winRatePct", 50),
    },
  });
  revalidateAll();
}
