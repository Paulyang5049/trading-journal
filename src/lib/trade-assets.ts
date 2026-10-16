import type { Prisma } from "@/generated/prisma/client";

export function normalizeSymbol(raw: string) {
  const symbol = raw.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9._:/-]{0,63}$/.test(symbol) ? symbol : null;
}
export async function resolveTradeAsset(
  tx: Prisma.TransactionClient,
  input: { symbol: string; assetClass: string; accountId: string },
) {
  const symbol = normalizeSymbol(input.symbol);
  if (!symbol)
    throw new Error("Enter a symbol of up to 64 letters, numbers or . _ : / -");
  const candidates = await tx.asset.findMany({
    where: {
      assetClass: input.assetClass,
      OR: [{ accountId: input.accountId }, { accountId: null }],
    },
  });
  const matches = candidates.filter(
    (a) => a.symbol.trim().toUpperCase() === symbol,
  );
  const existing =
    matches.find((a) => a.accountId === input.accountId) ?? matches[0];
  return (
    existing ??
    tx.asset.create({
      data: {
        symbol,
        assetClass: input.assetClass,
        accountId: input.accountId,
      },
    })
  );
}
