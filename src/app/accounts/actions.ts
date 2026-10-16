"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { dec } from "@/lib/money";
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
  await prisma.$transaction(async (tx) => {
    const event = await tx.capitalEvent.findUnique({
      where: { id: String(form.get("id") ?? "") },
    });
    if (!event) return;
    await tx.capitalEvent.deleteMany({
      where: event.transferId
        ? { transferId: event.transferId }
        : { id: event.id },
    });
  });
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function transferCapital(form: FormData) {
  const from = String(form.get("accountId") ?? "");
  const to = String(form.get("destinationId") ?? "");
  const raw = String(form.get("amount") ?? "").trim();
  const receivedRaw = String(form.get("receivedAmount") ?? "").trim();
  const date = String(form.get("datetime") ?? "");
  const datetime = date ? new Date(date) : new Date();
  const fail = () =>
    redirect(`/accounts?account=${encodeURIComponent(from)}&error=transfer`);
  if (
    !from ||
    !to ||
    from === to ||
    !raw ||
    !Number.isFinite(Number(raw)) ||
    Number(raw) <= 0 ||
    isNaN(datetime.getTime())
  )
    fail();
  const accounts = await prisma.account.findMany({
    where: { id: { in: [from, to] } },
  });
  const source = accounts.find((a) => a.id === from);
  const destination = accounts.find((a) => a.id === to);
  if (!source || !destination) return fail();
  const amount = dec(raw);
  const converted = source.currency !== destination.currency;
  if (
    converted &&
    (!receivedRaw ||
      !Number.isFinite(Number(receivedRaw)) ||
      Number(receivedRaw) <= 0)
  )
    fail();
  const received = converted ? dec(receivedRaw) : amount;
  const transferId = randomUUID();
  const note = String(form.get("note") ?? "").trim();
  await prisma.$transaction([
    prisma.capitalEvent.create({
      data: {
        accountId: from,
        type: "transfer out",
        amount: amount.negated().toString(),
        datetime,
        transferId,
        note: `To ${destination.name} (${destination.currency})${note ? ` · ${note}` : ""}`,
      },
    }),
    prisma.capitalEvent.create({
      data: {
        accountId: to,
        type: "transfer in",
        amount: received.toString(),
        datetime,
        transferId,
        note: `From ${source.name} (${source.currency})${note ? ` · ${note}` : ""}`,
      },
    }),
  ]);
  revalidatePath("/accounts");
  revalidatePath("/");
  redirect(`/accounts?account=${encodeURIComponent(from)}&transferred=1`);
}
