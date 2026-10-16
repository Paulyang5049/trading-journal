"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

function refresh(id: string) {
  for (const path of [
    "/",
    "/trades",
    `/trades/${id}`,
    "/mistakes",
    "/accounts",
    "/preparation",
  ])
    revalidatePath(path);
}
export async function closePosition(
  _state: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = String(form.get("id") ?? "");
  const price = Number(form.get("exitPrice"));
  const fees = Number(form.get("exitFees") || 0);
  const time = new Date(String(form.get("exitTime") ?? ""));
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(fees) ||
    isNaN(time.getTime())
  )
    return {
      error: "Enter a positive exit price, valid fee amount and exit time.",
    };
  const trade = await prisma.trade.findUnique({ where: { id } });
  if (!trade || trade.status !== "OPEN")
    return { error: "This position is no longer open. Refresh the list." };
  if (time < trade.entryTime)
    return { error: "Exit time cannot be before entry time." };
  const result = await prisma.trade.updateMany({
    where: { id, status: "OPEN", deletedAt: null },
    data: {
      exitPrice: price,
      exitFees: fees,
      exitTime: time,
      status: "CLOSED",
      reviewedAt: null,
    },
  });
  if (!result.count) return { error: "This position was already closed." };
  refresh(id);
  return { success: "Position closed. It is now in your review queue." };
}
export async function completeReview(
  _state: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = String(form.get("id") ?? "");
  const notes = String(form.get("notes") ?? "").trim();
  const confidence = Number(form.get("confidence"));
  const discipline = Number(form.get("discipline"));
  if (
    !notes ||
    ![confidence, discipline].every(
      (v) => Number.isInteger(v) && v >= 1 && v <= 5,
    )
  )
    return {
      error: "Add a lesson and confidence / discipline scores between 1 and 5.",
    };
  const result = await prisma.trade.updateMany({
    where: { id, status: "CLOSED", deletedAt: null },
    data: { notes, confidence, discipline, reviewedAt: new Date() },
  });
  if (!result.count) return { error: "Only closed trades can be reviewed." };
  refresh(id);
  return { success: "Review saved and marked complete." };
}

export async function removeTrade(
  _state: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { error: "Select a trade to delete." };
  try {
    await prisma.trade.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { error: "Could not delete this trade. Please try again." };
  }
  refresh(id);
  return { success: "Moved to Trash. You can restore it any time." };
}

export async function restoreTrade(
  _state: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const id = String(form.get("id") ?? "").trim();
  if (!id) return { error: "Select a trade to restore." };
  try {
    await prisma.trade.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  } catch {
    return { error: "Could not restore this trade. Please try again." };
  }
  refresh(id);
  return { success: "Trade restored." };
}
