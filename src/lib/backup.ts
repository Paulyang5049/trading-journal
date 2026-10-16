import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const tables = [
  "Account",
  "Asset",
  "Strategy",
  "Emotion",
  "Mistake",
  "Settings",
  "WatchlistItem",
  "CapitalEvent",
  "Trade",
  "TradeScreenshot",
  "TradeMistake",
] as const;
type TableName = (typeof tables)[number];
type Cell = string | number | null;
type Row = Record<string, Cell>;
const value = z.union([z.string(), z.number().finite(), z.null()]);
const rows = z.array(z.record(z.string(), value)).max(100000);
const shape = Object.fromEntries(tables.map((t) => [t, rows])) as Record<
  TableName,
  typeof rows
>;
const format = z
  .object({
    format: z.literal("trading-journal"),
    version: z.literal(1),
    createdAt: z.string(),
    columns: z.record(z.string(), z.array(z.string())),
    tables: z.object(shape).strict(),
    images: z
      .array(z.object({ url: z.string(), base64: z.string() }).strict())
      .max(10000),
  })
  .strict();
export type JournalBackup = z.infer<typeof format>;
const filename = /^\/uploads\/([a-zA-Z0-9_-]+\.(png|jpe?g|webp))$/i;
const maxBytes = 50 * 1024 * 1024;
export const BACKUP_LIMIT = maxBytes;

export function databasePath() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:"))
    throw new Error("Backup currently supports local SQLite journals.");
  return path.resolve(url.slice(5));
}
function columns(db: Database.Database, table: TableName) {
  return (db.pragma(`table_info("${table}")`) as { name: string }[]).map(
    (c) => c.name,
  );
}
function snapshot(db: Database.Database, uploadDir: string): JournalBackup {
  return db.transaction(() => {
    const data = Object.fromEntries(
      tables.map((t) => [t, db.prepare(`SELECT * FROM "${t}"`).all()]),
    ) as Record<TableName, Row[]>;
    const urls = [
      ...new Set(
        data.TradeScreenshot.map((row) => String(row.url)).filter((url) =>
          url.startsWith("/uploads/"),
        ),
      ),
    ];
    return {
      format: "trading-journal" as const,
      version: 1 as const,
      createdAt: new Date().toISOString(),
      columns: Object.fromEntries(tables.map((t) => [t, columns(db, t)])),
      tables: data,
      images: urls.map((url) => {
        const match = filename.exec(url);
        if (!match)
          throw new Error("A screenshot has an unsupported filename.");
        try {
          return {
            url,
            base64: readFileSync(path.join(uploadDir, match[1])).toString(
              "base64",
            ),
          };
        } catch {
          throw new Error(
            "A screenshot file is missing. Restore the missing file before making a backup.",
          );
        }
      }),
    };
  })();
}
export function exportBackup(
  dbFile = databasePath(),
  uploadDir = path.join(process.cwd(), "public/uploads"),
) {
  const db = new Database(dbFile, { readonly: true, fileMustExist: true });
  try {
    const result = JSON.stringify(snapshot(db, uploadDir));
    if (Buffer.byteLength(result) > maxBytes)
      throw new Error("This backup exceeds the 50 MB limit.");
    return result;
  } finally {
    db.close();
  }
}
export function parseBackup(input: string): JournalBackup {
  if (Buffer.byteLength(input) > maxBytes)
    throw new Error("Backups must be smaller than 50 MB.");
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    throw new Error(
      "This file is not valid JSON. Choose a Trading Journal backup.",
    );
  }
  const parsed = format.safeParse(json);
  if (!parsed.success)
    throw new Error("This is not a supported Trading Journal backup.");
  return parsed.data;
}
function imageBytes(base64: string, ext: string) {
  if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
    throw new Error("Invalid screenshot data.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.toString("base64") !== base64)
    throw new Error("Invalid screenshot encoding.");
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!(ext === "png" ? png : ext === "webp" ? webp : jpg))
    throw new Error("Unsupported screenshot content.");
  return bytes;
}
export function restoreBackup(
  input: string,
  dbFile = databasePath(),
  uploadDir = path.join(process.cwd(), "public/uploads"),
  safetyDir = path.join(process.cwd(), "backups"),
) {
  const backup = parseBackup(input);
  const db = new Database(dbFile, { fileMustExist: true });
  const written: string[] = [];
  try {
    db.pragma("foreign_keys = ON");
    for (const table of tables) {
      const expected = columns(db, table);
      if (JSON.stringify(expected) !== JSON.stringify(backup.columns[table]))
        throw new Error(
          "Backup schema differs from this app. Use the same app version to restore.",
        );
      const meta = db.pragma(`table_info("${table}")`) as {
        name: string;
        type: string;
        notnull: number;
      }[];
      for (const row of backup.tables[table]) {
        if (
          Object.keys(row).length !== expected.length ||
          expected.some((k) => !(k in row))
        )
          throw new Error("Backup contains invalid fields.");
        for (const field of meta) {
          const cell = row[field.name];
          if (cell === null) {
            if (field.notnull)
              throw new Error("Backup contains missing required values.");
            continue;
          }
          if (field.type === "TEXT" && typeof cell !== "string")
            throw new Error("Backup contains invalid text.");
          if (
            ["DECIMAL", "REAL", "INTEGER"].includes(field.type) &&
            (!Number.isFinite(Number(cell)) ||
              (typeof cell === "string" && !cell.trim()))
          )
            throw new Error("Backup contains invalid numbers.");
          if (field.type === "INTEGER" && !Number.isInteger(Number(cell)))
            throw new Error("Backup contains invalid integer values.");
          if (
            field.type === "DATETIME" &&
            (typeof cell === "number"
              ? !Number.isFinite(new Date(cell).getTime())
              : !Number.isFinite(Date.parse(String(cell))))
          )
            throw new Error("Backup contains invalid dates.");
        }
        if (
          table === "Trade" &&
          (Number(row.size) <= 0 ||
            Number(row.entryPrice) <= 0 ||
            Number(row.leverage) < 1 ||
            !["OPEN", "CLOSED"].includes(String(row.status)) ||
            !["LONG", "SHORT"].includes(String(row.direction)))
        )
          throw new Error("Backup contains an invalid trade.");
      }
    }
    const imageMap = new Map<
      string,
      { url: string; bytes: Buffer; name: string }
    >();
    for (const image of backup.images) {
      const match = filename.exec(image.url);
      if (!match || imageMap.has(image.url))
        throw new Error("Invalid screenshot path.");
      const ext = match[2].toLowerCase();
      const name = `restored-${randomUUID()}.${ext}`;
      imageMap.set(image.url, {
        name,
        url: `/uploads/${name}`,
        bytes: imageBytes(image.base64, ext),
      });
    }
    for (const row of backup.tables.TradeScreenshot) {
      if (typeof row.url !== "string")
        throw new Error("Invalid screenshot reference.");
      if (row.url.startsWith("/uploads/")) {
        const image = imageMap.get(row.url);
        if (!image) throw new Error("Backup is missing a screenshot.");
        row.url = image.url;
      } else if (!/^https?:\/\//i.test(row.url))
        throw new Error("Unsupported screenshot URL.");
    }
    // Keep the existing workspace recoverable; preserve original uploads as well.
    // The immediate transaction prevents concurrent writes between snapshot and replacement.
    let safetyName = "";
    db.transaction(() => {
      const safety = JSON.stringify(snapshot(db, uploadDir));
      mkdirSync(safetyDir, { recursive: true });
      safetyName = `before-restore-${Date.now()}-${randomUUID()}.json`;
      writeFileSync(path.join(safetyDir, safetyName), safety, {
        flag: "wx",
        mode: 0o600,
      });
      mkdirSync(uploadDir, { recursive: true });
      for (const image of imageMap.values()) {
        const target = path.join(uploadDir, image.name);
        writeFileSync(target, image.bytes, { flag: "wx" });
        written.push(target);
      }
      db.pragma("defer_foreign_keys = ON");
      for (const table of [...tables].reverse())
        db.prepare(`DELETE FROM "${table}"`).run();
      for (const table of tables) {
        const keys = columns(db, table);
        const stmt = db.prepare(
          `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
        );
        for (const row of backup.tables[table])
          stmt.run(...keys.map((k) => row[k]));
      }
      if ((db.pragma("foreign_key_check") as unknown[]).length)
        throw new Error("Backup has broken record references.");
    }).immediate();
    return {
      safetyName,
      trades: backup.tables.Trade.length,
      images: imageMap.size,
    };
  } catch (error) {
    for (const target of written) {
      try {
        unlinkSync(target);
      } catch {
        /* Unused uploads can be removed later. */
      }
    }
    throw error;
  } finally {
    db.close();
  }
}
