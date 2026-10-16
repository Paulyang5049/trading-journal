import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { BACKUP_LIMIT, exportBackup, restoreBackup } from "@/lib/backup";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return new Response(exportBackup(), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="trading-journal-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup failed." },
      { status: 400 },
    );
  }
}
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== request.nextUrl.origin ||
    request.headers.get("x-journal-restore") !== "confirmed"
  ) {
    return NextResponse.json(
      { error: "Restore must be confirmed from this app." },
      { status: 403 },
    );
  }
  if (Number(request.headers.get("content-length")) > BACKUP_LIMIT)
    return NextResponse.json(
      { error: "Backup exceeds 50 MB." },
      { status: 413 },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Choose a backup file.");
    let total = 0;
    const parts: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > BACKUP_LIMIT) {
        await reader.cancel();
        throw new Error("Backup exceeds 50 MB.");
      }
      parts.push(value);
    }
    const result = restoreBackup(Buffer.concat(parts).toString("utf8"));
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Restore failed. Your current journal has been preserved.",
      },
      { status: 400 },
    );
  }
}
