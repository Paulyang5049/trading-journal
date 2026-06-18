"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function createMistake(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const description = String(form.get("description") ?? "").trim() || null;
  await prisma.mistake.create({ data: { name, description } });
  revalidatePath("/mistakes");
}

export async function deleteMistake(form: FormData) {
  await prisma.mistake.delete({ where: { id: String(form.get("id") ?? "") } });
  revalidatePath("/mistakes");
}
