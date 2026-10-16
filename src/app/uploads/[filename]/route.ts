import { readFile } from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
const types: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
// Serve runtime uploads too: production public-file discovery happens at startup.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!/^[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/i.test(filename))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public/uploads", filename),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": types[filename.split(".").pop()!.toLowerCase()],
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
