"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

function s(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function opt(form: FormData, key: string): string | null {
  const v = s(form, key);
  return v === "" ? null : v;
}
function numOrNull(form: FormData, key: string): number | null {
  const raw = s(form, key);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function dateOrNull(form: FormData, key: string): Date | null {
  const raw = s(form, key);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function buildData(form: FormData) {
  const exitPrice = numOrNull(form, "exitPrice");
  const exitTime = dateOrNull(form, "exitTime");
  // A trade is CLOSED once it has an exit price.
  const status = exitPrice != null ? "CLOSED" : "OPEN";
  return {
    accountId: s(form, "accountId"),
    assetId: s(form, "assetId"),
    strategyId: opt(form, "strategyId"),
    emotionId: opt(form, "emotionId"),
    direction: s(form, "direction") === "SHORT" ? "SHORT" : "LONG",
    size: numOrNull(form, "size") ?? 0,
    entryTime: dateOrNull(form, "entryTime") ?? new Date(),
    entryPrice: numOrNull(form, "entryPrice") ?? 0,
    stopLoss: numOrNull(form, "stopLoss"),
    takeProfit: numOrNull(form, "takeProfit"),
    exitTime,
    exitPrice,
    fees: numOrNull(form, "fees") ?? 0,
    riskPct: numOrNull(form, "riskPct"),
    capitalUsagePct: numOrNull(form, "capitalUsagePct"),
    confidence: numOrNull(form, "confidence"),
    discipline: numOrNull(form, "discipline"),
    notes: opt(form, "notes"),
    status,
  };
}

async function syncMistakes(tradeId: string, form: FormData) {
  const ids = form.getAll("mistakes").map(String).filter(Boolean);
  await prisma.tradeMistake.deleteMany({ where: { tradeId } });
  if (ids.length) {
    await prisma.tradeMistake.createMany({
      data: ids.map((mistakeId) => ({ tradeId, mistakeId })),
    });
  }
}

export async function createTrade(form: FormData) {
  const data = buildData(form);
  if (!data.accountId || !data.assetId) return;
  const trade = await prisma.trade.create({ data });
  await syncMistakes(trade.id, form);
  revalidatePath("/trades");
  revalidatePath("/");
  redirect(`/trades/${trade.id}`);
}

export async function updateTrade(form: FormData) {
  const id = s(form, "id");
  if (!id) return;
  const data = buildData(form);
  await prisma.trade.update({ where: { id }, data });
  await syncMistakes(id, form);
  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
  revalidatePath("/");
  redirect(`/trades/${id}`);
}

export async function deleteTrade(form: FormData) {
  const id = s(form, "id");
  await prisma.trade.delete({ where: { id } });
  revalidatePath("/trades");
  revalidatePath("/");
  redirect("/trades");
}

export async function uploadScreenshot(form: FormData) {
  const tradeId = s(form, "tradeId");
  const file = form.get("file");
  if (!tradeId || !(file instanceof File) || file.size === 0) return;

  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().slice(0, 5);
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  await prisma.tradeScreenshot.create({
    data: {
      tradeId,
      url: `/uploads/${filename}`,
      caption: opt(form, "caption"),
      kind: s(form, "kind") || "POST",
    },
  });
  revalidatePath(`/trades/${tradeId}`);
}

export async function deleteScreenshot(form: FormData) {
  const id = s(form, "id");
  const tradeId = s(form, "tradeId");
  await prisma.tradeScreenshot.delete({ where: { id } });
  revalidatePath(`/trades/${tradeId}`);
}
