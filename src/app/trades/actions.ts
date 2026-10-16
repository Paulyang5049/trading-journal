"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { accountBalances } from "@/lib/account-balances";
import { positionRisk } from "@/lib/workspace";
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

async function buildData(form: FormData) {
  const rawLeverage = s(form, "leverage");
  const leverage = rawLeverage === "" ? 1 : Number(rawLeverage);
  if (!Number.isFinite(leverage) || leverage < 1) {
    redirect("/trades?error=invalid-leverage");
  }
  const exitPrice = numOrNull(form, "exitPrice");
  const exitTime = dateOrNull(form, "exitTime");
  const balance = (await accountBalances()).find(
    (a) => a.id === s(form, "accountId"),
  );
  const risk = positionRisk(
    balance?.equity ?? 0,
    numOrNull(form, "size") ?? 0,
    numOrNull(form, "entryPrice") ?? 0,
    numOrNull(form, "stopLoss"),
    leverage,
  );
  // A trade is CLOSED once it has an exit price.
  const status = exitPrice != null ? "CLOSED" : "OPEN";
  return {
    accountId: s(form, "accountId"),
    assetId: s(form, "assetId"),
    strategyId: opt(form, "strategyId"),
    emotionId: opt(form, "emotionId"),
    direction: s(form, "direction") === "SHORT" ? "SHORT" : "LONG",
    size: numOrNull(form, "size") ?? 0,
    leverage,
    entryTime: dateOrNull(form, "entryTime") ?? new Date(),
    entryPrice: numOrNull(form, "entryPrice") ?? 0,
    stopLoss: numOrNull(form, "stopLoss"),
    takeProfit: numOrNull(form, "takeProfit"),
    exitTime,
    exitPrice,
    fees: numOrNull(form, "fees") ?? 0,
    exitFees: numOrNull(form, "exitFees") ?? 0,
    riskPct: risk?.riskPct ?? null,
    capitalUsagePct: risk?.capitalUsagePct ?? null,
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

async function prepareScreenshots(form: FormData) {
  const groups = [
    { name: "entryImages", kind: "PRE" },
    { name: "exitImages", kind: "POST" },
  ];
  const types: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const selected = groups.map((group) => ({
    ...group,
    files: form
      .getAll(group.name)
      .filter((f): f is File => f instanceof File && f.size > 0),
  }));
  for (const group of selected) {
    if (
      group.files.some((f) => !types[f.type]) ||
      group.files.reduce((sum, f) => sum + f.size, 0) > 4 * 1024 * 1024
    ) {
      redirect("/trades?error=invalid-images");
    }
  }
  const screenshots: { url: string; kind: string; caption: string }[] = [];
  for (const group of selected)
    for (const file of group.files) {
      const filename = `${randomUUID()}.${types[file.type]}`;
      const dir = path.join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, filename),
        Buffer.from(await file.arrayBuffer()),
      );
      screenshots.push({
        url: `/uploads/${filename}`,
        kind: group.kind,
        caption: file.name,
      });
    }
  return screenshots;
}

export async function createTrade(form: FormData) {
  const data = await buildData(form);
  if (!data.accountId || !data.assetId) return;
  const screenshots = await prepareScreenshots(form);
  const trade = await prisma.trade.create({
    data: { ...data, screenshots: { create: screenshots } },
  });
  await syncMistakes(trade.id, form);
  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/preparation");
  revalidatePath("/mistakes");
  redirect(`/trades/${trade.id}`);
}

export async function updateTrade(form: FormData) {
  const id = s(form, "id");
  if (!id) return;
  const data = await buildData(form);
  const screenshots = await prepareScreenshots(form);
  await prisma.trade.update({
    where: { id },
    data: { ...data, screenshots: { create: screenshots } },
  });
  await syncMistakes(id, form);
  revalidatePath("/trades");
  revalidatePath(`/trades/${id}`);
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/preparation");
  revalidatePath("/mistakes");
  redirect(`/trades/${id}`);
}

export async function deleteTrade(form: FormData) {
  const id = s(form, "id");
  await prisma.trade.delete({ where: { id } });
  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/preparation");
  revalidatePath("/mistakes");
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
  await writeFile(
    path.join(dir, filename),
    Buffer.from(await file.arrayBuffer()),
  );

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
