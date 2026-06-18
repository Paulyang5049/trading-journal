import Papa from "papaparse";
import type { Direction } from "@/lib/analytics";

// A single normalized trade parsed from a CSV row, in the shape our import
// action and `deriveTrade` consume. Asset is carried as a symbol string and
// resolved to an Asset record at import time.
export interface ParsedTradeRow {
  symbol: string;
  direction: Direction;
  size: number;
  entryTime: Date;
  entryPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  exitTime: Date | null;
  exitPrice: number | null;
  fees: number;
  strategy: string | null;
  notes: string | null;
}

export interface RowError {
  row: number; // 1-based data row (excludes header)
  message: string;
}

export interface ParseResult {
  rows: ParsedTradeRow[];
  errors: RowError[];
  totalRows: number;
}

// Accepted header names per canonical field (case-insensitive, trimmed).
// Covers our own export plus common MetaTrader / IBKR / TradingView columns.
const ALIASES: Record<string, string[]> = {
  symbol: ["symbol", "ticker", "instrument", "pair", "market"],
  direction: ["direction", "type", "side", "action", "b/s"],
  size: ["size", "volume", "qty", "quantity", "lots", "units", "shares"],
  entryTime: ["entrytime", "entry time", "open time", "opentime", "open", "date", "time", "datetime"],
  entryPrice: ["entryprice", "entry price", "open price", "openprice", "price", "avg price"],
  stopLoss: ["stoploss", "stop loss", "sl", "s/l", "stop"],
  takeProfit: ["takeprofit", "take profit", "tp", "t/p", "target"],
  exitTime: ["exittime", "exit time", "close time", "closetime", "close date"],
  exitPrice: ["exitprice", "exit price", "close price", "closeprice", "exit"],
  fees: ["fees", "fee", "commission", "commissions", "comm"],
  strategy: ["strategy", "setup", "system"],
  notes: ["notes", "note", "comment", "comments", "remarks"],
};

function buildHeaderMap(headers: string[]): Record<string, string> {
  // canonical field -> actual header present in the file
  const map: Record<string, string> = {};
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const [field, names] of Object.entries(ALIASES)) {
    for (const name of names) {
      const idx = normalized.indexOf(name);
      if (idx !== -1) {
        map[field] = headers[idx];
        break;
      }
    }
  }
  return map;
}

function parseNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[,\s$]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  let d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  // MetaTrader uses dotted dates, e.g. "2024.01.02 09:30:00".
  const dotted = trimmed.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3");
  d = new Date(dotted);
  return isNaN(d.getTime()) ? null : d;
}

function parseDirection(raw: string | undefined): Direction | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (["long", "buy", "b", "bought"].includes(v)) return "LONG";
  if (["short", "sell", "s", "sold"].includes(v)) return "SHORT";
  return null;
}

/**
 * Parse a CSV string into normalized trade rows. Header names are matched
 * flexibly via ALIASES, so generic, MetaTrader and IBKR exports all work.
 * Returns valid rows plus per-row errors (invalid rows are skipped, not thrown).
 */
export function parseTradesCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const map = buildHeaderMap(headers);
  const rows: ParsedTradeRow[] = [];
  const errors: RowError[] = [];
  const data = parsed.data ?? [];

  const get = (r: Record<string, string>, field: string) =>
    map[field] ? r[map[field]] : undefined;

  data.forEach((r, i) => {
    const rowNum = i + 1;
    const symbol = (get(r, "symbol") ?? "").trim().toUpperCase();
    const size = parseNumber(get(r, "size"));
    const entryPrice = parseNumber(get(r, "entryPrice"));
    const entryTime = parseDate(get(r, "entryTime"));

    const missing: string[] = [];
    if (!symbol) missing.push("symbol");
    if (size == null) missing.push("size");
    if (entryPrice == null) missing.push("entry price");
    if (!entryTime) missing.push("entry time");
    if (missing.length) {
      errors.push({ row: rowNum, message: `Missing/invalid: ${missing.join(", ")}` });
      return;
    }

    const direction = parseDirection(get(r, "direction")) ?? "LONG";

    rows.push({
      symbol,
      direction,
      size: size!,
      entryTime: entryTime!,
      entryPrice: entryPrice!,
      stopLoss: parseNumber(get(r, "stopLoss")),
      takeProfit: parseNumber(get(r, "takeProfit")),
      exitTime: parseDate(get(r, "exitTime")),
      exitPrice: parseNumber(get(r, "exitPrice")),
      fees: parseNumber(get(r, "fees")) ?? 0,
      strategy: (get(r, "strategy") ?? "").trim() || null,
      notes: (get(r, "notes") ?? "").trim() || null,
    });
  });

  return { rows, errors, totalRows: data.length };
}
