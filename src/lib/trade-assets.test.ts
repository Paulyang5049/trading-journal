import { expect, it, vi } from "vitest";
import { normalizeSymbol, resolveTradeAsset } from "./trade-assets";
import type { Prisma } from "@/generated/prisma/client";
it("normalizes typed exchange symbols and rejects blank or malformed values", () => {
  expect(normalizeSymbol("  btcusdt.p  ")).toBe("BTCUSDT.P");
  expect(normalizeSymbol("")).toBeNull();
  expect(normalizeSymbol("A".repeat(65))).toBeNull();
  expect(normalizeSymbol("<script>")).toBeNull();
});
it("reuses an account symbol before a shared symbol and creates only when absent", async () => {
  const findMany = vi.fn().mockResolvedValue([
    { id: "global", symbol: "BTCUSDT.P", accountId: null },
    { id: "local", symbol: "btcusdt.p", accountId: "a" },
  ]);
  const create = vi.fn().mockResolvedValue({ id: "new" });
  const tx = {
    asset: { findMany, create },
  } as unknown as Prisma.TransactionClient;
  const input = { symbol: " btcusdt.p ", assetClass: "Crypto", accountId: "a" };
  expect((await resolveTradeAsset(tx, input)).id).toBe("local");
  expect(create).not.toHaveBeenCalled();
  findMany.mockResolvedValue([]);
  expect((await resolveTradeAsset(tx, input)).id).toBe("new");
  expect(create).toHaveBeenCalledWith({
    data: { symbol: "BTCUSDT.P", assetClass: "Crypto", accountId: "a" },
  });
});
