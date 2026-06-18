import { describe, it, expect } from "vitest";
import { parseTradesCsv } from "./parse";

describe("parseTradesCsv", () => {
  it("parses a generic CSV with our own column names", () => {
    const csv = [
      "symbol,direction,size,entryTime,entryPrice,stopLoss,takeProfit,exitTime,exitPrice,fees,strategy,notes",
      "EURUSD,LONG,10000,2024-01-02 09:30:00,1.1000,1.0950,1.1150,2024-01-02 12:00:00,1.1130,2,Breakout,good entry",
    ].join("\n");
    const { rows, errors, totalRows } = parseTradesCsv(csv);
    expect(totalRows).toBe(1);
    expect(errors).toHaveLength(0);
    expect(rows[0]).toMatchObject({
      symbol: "EURUSD",
      direction: "LONG",
      size: 10000,
      entryPrice: 1.1,
      stopLoss: 1.095,
      takeProfit: 1.115,
      exitPrice: 1.113,
      fees: 2,
      strategy: "Breakout",
      notes: "good entry",
    });
    expect(rows[0].entryTime).toBeInstanceOf(Date);
    expect(rows[0].exitTime).toBeInstanceOf(Date);
  });

  it("maps MetaTrader-style headers and dotted dates and buy/sell", () => {
    const csv = [
      "Symbol,Type,Volume,Open Time,Open Price,S/L,T/P,Close Time,Close Price,Commission",
      "GBPUSD,sell,5000,2024.03.04 08:00:00,1.2700,1.2760,1.2550,2024.03.04 10:30:00,1.2620,1.5",
    ].join("\n");
    const { rows, errors } = parseTradesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows[0].symbol).toBe("GBPUSD");
    expect(rows[0].direction).toBe("SHORT");
    expect(rows[0].size).toBe(5000);
    expect(rows[0].fees).toBe(1.5);
    expect(rows[0].entryTime.getFullYear()).toBe(2024);
  });

  it("strips thousands separators and currency symbols from numbers", () => {
    const csv = [
      "ticker,side,qty,date,price",
      "AAPL,buy,\"1,000\",2024-05-01,$150.25",
    ].join("\n");
    const { rows, errors } = parseTradesCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows[0].size).toBe(1000);
    expect(rows[0].entryPrice).toBe(150.25);
  });

  it("records errors for invalid rows and keeps the valid ones", () => {
    const csv = [
      "symbol,size,entryPrice,entryTime",
      ",10,1.1,2024-01-01", // missing symbol
      "EURUSD,,1.1,2024-01-01", // missing size
      "EURUSD,10,1.1,2024-01-02", // valid
    ].join("\n");
    const { rows, errors, totalRows } = parseTradesCsv(csv);
    expect(totalRows).toBe(3);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0].row).toBe(1);
  });

  it("defaults direction to LONG when missing/unknown", () => {
    const csv = ["symbol,size,entryPrice,entryTime", "EURUSD,10,1.1,2024-01-02"].join("\n");
    const { rows } = parseTradesCsv(csv);
    expect(rows[0].direction).toBe("LONG");
  });
});
