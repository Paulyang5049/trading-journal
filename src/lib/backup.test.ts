import { afterEach, beforeEach, expect, it } from "vitest";
import Database from "better-sqlite3";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";
import { exportBackup, parseBackup, restoreBackup } from "./backup";

let dir: string, dbFile: string, uploads: string, safety: string;
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j/9kAAAAASUVORK5CYII=",
  "base64",
);
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "journal-backup-test-"));
  dbFile = path.join(dir, "test.db");
  uploads = path.join(dir, "uploads");
  safety = path.join(dir, "safety");
  mkdirSync(uploads);
  const db = new Database(dbFile);
  const root = path.join(process.cwd(), "prisma/migrations");
  for (const migration of readdirSync(root).sort()) {
    if (migration === "migration_lock.toml") continue;
    db.exec(readFileSync(path.join(root, migration, "migration.sql"), "utf8"));
  }
  db.exec(`INSERT INTO Account (id, name) VALUES ('a', 'Original');
    INSERT INTO Asset (id, symbol) VALUES ('x', 'BTCUSD');
    INSERT INTO Trade (id, accountId, assetId, size, entryTime, entryPrice) VALUES ('t','a','x',2,1792162800000,100);
    INSERT INTO TradeScreenshot (id, tradeId, url) VALUES ('s','t','/uploads/chart.png');`);
  writeFileSync(path.join(uploads, "chart.png"), pixel);
  db.close();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));
it("round-trips all records and screenshot bytes, retaining a safety copy", () => {
  const backup = exportBackup(dbFile, uploads);
  const db = new Database(dbFile);
  db.exec(
    "UPDATE Account SET name = 'Changed'; UPDATE Trade SET deletedAt = 1792162800000;",
  );
  db.close();
  const result = restoreBackup(backup, dbFile, uploads, safety);
  expect(result.trades).toBe(1);
  const restored = new Database(dbFile);
  expect(restored.prepare("SELECT name FROM Account").get()).toEqual({
    name: "Original",
  });
  expect(restored.prepare("SELECT deletedAt FROM Trade").get()).toEqual({
    deletedAt: null,
  });
  const row = restored.prepare("SELECT url FROM TradeScreenshot").get() as {
    url: string;
  };
  expect(readFileSync(path.join(uploads, path.basename(row.url)))).toEqual(
    pixel,
  );
  const before = parseBackup(
    readFileSync(path.join(safety, result.safetyName), "utf8"),
  );
  expect(before.tables.Account[0].name).toBe("Changed");
  expect(before.tables.Trade[0].deletedAt).toBe(1792162800000);
  restored.close();
});
it("rolls back a broken reference and leaves the current journal intact", () => {
  const backup = parseBackup(exportBackup(dbFile, uploads));
  backup.tables.Trade[0].accountId = "missing";
  expect(() =>
    restoreBackup(JSON.stringify(backup), dbFile, uploads, safety),
  ).toThrow(/references|FOREIGN KEY/);
  const db = new Database(dbFile);
  expect(db.prepare("SELECT accountId FROM Trade").get()).toEqual({
    accountId: "a",
  });
  expect(db.prepare("SELECT url FROM TradeScreenshot").get()).toEqual({
    url: "/uploads/chart.png",
  });
  expect(readdirSync(uploads)).toEqual(["chart.png"]);
  db.close();
});
it("rejects paths, missing screenshots and schema mismatch before replacing data", () => {
  const backup = parseBackup(exportBackup(dbFile, uploads));
  backup.images[0].url = "/uploads/../../secret.png";
  expect(() =>
    restoreBackup(JSON.stringify(backup), dbFile, uploads, safety),
  ).toThrow("path");
  backup.images = [];
  expect(() =>
    restoreBackup(JSON.stringify(backup), dbFile, uploads, safety),
  ).toThrow("missing a screenshot");
  backup.columns.Trade = ["id"];
  expect(() =>
    restoreBackup(JSON.stringify(backup), dbFile, uploads, safety),
  ).toThrow("schema");
});
it("rejects arbitrary files masquerading as screenshots", () => {
  const backup = parseBackup(exportBackup(dbFile, uploads));
  backup.images[0].base64 = Buffer.from("<script>alert(1)</script>").toString(
    "base64",
  );
  expect(() =>
    restoreBackup(JSON.stringify(backup), dbFile, uploads, safety),
  ).toThrow("content");
});
