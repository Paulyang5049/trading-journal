import { notFound } from "next/navigation";
import { accountBalances } from "@/lib/account-balances";
import { prisma } from "@/lib/db";
import { getFormOptions } from "@/lib/trades";
import { toLocalInput } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { TradeForm, type TradeFormData } from "@/components/trade-form";
import { updateTrade } from "../../actions";

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const balances = await accountBalances();
  const [trade, options] = await Promise.all([
    prisma.trade.findUnique({
      where: { id },
      include: { mistakes: true },
    }),
    getFormOptions(),
  ]);
  if (!trade) notFound();

  const initial: TradeFormData = {
    id: trade.id,
    accountId: trade.accountId,
    assetId: trade.assetId,
    strategyId: trade.strategyId,
    emotionId: trade.emotionId,
    direction: trade.direction,
    size: Number(trade.size),
    leverage: trade.leverage,
    entryTime: toLocalInput(trade.entryTime),
    entryPrice: Number(trade.entryPrice),
    stopLoss: trade.stopLoss != null ? Number(trade.stopLoss) : null,
    takeProfit: trade.takeProfit != null ? Number(trade.takeProfit) : null,
    exitTime: trade.exitTime ? toLocalInput(trade.exitTime) : null,
    exitPrice: trade.exitPrice != null ? Number(trade.exitPrice) : null,
    fees: Number(trade.fees),
    exitFees: Number(trade.exitFees),
    riskPct: trade.riskPct,
    capitalUsagePct: trade.capitalUsagePct,
    confidence: trade.confidence,
    discipline: trade.discipline,
    notes: trade.notes,
    mistakeIds: trade.mistakes.map((m) => m.mistakeId),
  };

  return (
    <div>
      <PageHeader title="Edit trade" />
      <TradeForm
        action={updateTrade}
        {...options}
        accounts={balances}
        initial={initial}
      />
    </div>
  );
}
