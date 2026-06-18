"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function addCapitalEvent(form: FormData) {
  const accountId = String(form.get("accountId") ?? "");
  const type = String(form.get("type") ?? "deposit");
  const rawAmount = Number(form.get("amount"));
  if (!accountId || !Number.isFinite(rawAmount)) return;

  // Store signed amounts: withdrawals reduce capital.
  const magnitude = Math.abs(rawAmount);
  const amount = type === "withdraw" ? -magnitude : magnitude;
  const dt = String(form.get("datetime") ?? "");
  const datetime = dt ? new Date(dt) : new Date();

  await prisma.capitalEvent.create({
    data: {
      accountId,
      type,
      amount,
      datetime: isNaN(datetime.getTime()) ? new Date() : datetime,
      note: String(form.get("note") ?? "").trim() || null,
    },
  });
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function deleteCapitalEvent(form: FormData) {
  await prisma.capitalEvent.delete({ where: { id: String(form.get("id") ?? "") } });
  revalidatePath("/accounts");
  revalidatePath("/");
}
