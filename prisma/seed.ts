import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const EMOTIONS = [
  { name: "Confident", score: 3, explanation: "Calm, followed the plan." },
  { name: "Calm", score: 2, explanation: "Neutral and focused." },
  { name: "Hopeful", score: 1, explanation: "Optimistic but unproven." },
  { name: "Neutral", score: 0, explanation: "No strong feeling." },
  { name: "Anxious", score: -2, explanation: "Nervous, second-guessing." },
  { name: "Fearful", score: -3, explanation: "Afraid of loss." },
  { name: "Greedy", score: -3, explanation: "Chasing more than planned." },
  { name: "FOMO", score: -4, explanation: "Entered on fear of missing out." },
  { name: "Revenge", score: -5, explanation: "Trading to recover a loss." },
];

const STRATEGIES = [
  { name: "Breakout", description: "Enter on a break of a key level." },
  { name: "Trend Following", description: "Trade in the direction of the trend." },
  { name: "Mean Reversion", description: "Fade extremes back to the mean." },
  { name: "Scalping", description: "Quick in-and-out on small moves." },
  { name: "Swing", description: "Multi-day positional trades." },
];

const MISTAKES = [
  { name: "No stop loss", description: "Entered without a defined stop." },
  { name: "Moved stop", description: "Widened the stop to avoid a loss." },
  { name: "Oversized", description: "Risked more than the plan allowed." },
  { name: "Chased entry", description: "Entered late after the move started." },
  { name: "Ignored plan", description: "Deviated from the trading plan." },
  { name: "Early exit", description: "Closed a winner too soon." },
  { name: "Revenge trade", description: "Traded to recover a prior loss." },
];

async function main() {
  for (const e of EMOTIONS) {
    await prisma.emotion.upsert({ where: { name: e.name }, update: e, create: e });
  }
  for (const s of STRATEGIES) {
    await prisma.strategy.upsert({ where: { name: s.name }, update: s, create: s });
  }
  for (const m of MISTAKES) {
    await prisma.mistake.upsert({ where: { name: m.name }, update: m, create: m });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const accountCount = await prisma.account.count();
  if (accountCount === 0) {
    const account = await prisma.account.create({
      data: {
        name: "Demo Account",
        assetClass: "Forex",
        currency: "USD",
        startingCapital: 10000,
        capitalEvents: {
          create: {
            type: "deposit",
            amount: 10000,
            datetime: new Date("2024-01-01T00:00:00Z"),
            note: "Initial deposit",
          },
        },
        assets: {
          create: [
            { symbol: "EURUSD", assetClass: "Forex" },
            { symbol: "GBPUSD", assetClass: "Forex" },
          ],
        },
      },
      include: { assets: true },
    });
    console.log(`Seeded demo account ${account.id} with ${account.assets.length} assets.`);
  }

  // Demo trades so the dashboard has something to show on first run.
  const tradeCount = await prisma.trade.count();
  if (tradeCount === 0) {
    const account = await prisma.account.findFirst({ include: { assets: true } });
    const strat = await prisma.strategy.findFirst({ where: { name: "Breakout" } });
    const emo = await prisma.emotion.findFirst({ where: { name: "Confident" } });
    if (account && account.assets.length) {
      const eur = account.assets[0].id;
      const gbp = account.assets[1]?.id ?? eur;
      const day = 24 * 60 * 60 * 1000;
      const base = new Date("2024-01-02T09:30:00Z").getTime();
      const samples = [
        { assetId: eur, dir: "LONG", size: 10000, entry: 1.1, stop: 1.095, tp: 1.115, exit: 1.113, conf: 4, disc: 5 },
        { assetId: gbp, dir: "SHORT", size: 8000, entry: 1.27, stop: 1.276, tp: 1.255, exit: 1.272, conf: 2, disc: 2 },
        { assetId: eur, dir: "LONG", size: 12000, entry: 1.105, stop: 1.1, tp: 1.12, exit: 1.118, conf: 5, disc: 5 },
        { assetId: eur, dir: "LONG", size: 9000, entry: 1.108, stop: 1.103, tp: 1.12, exit: 1.104, conf: 3, disc: 3 },
        { assetId: gbp, dir: "LONG", size: 7000, entry: 1.26, stop: 1.254, tp: 1.275, exit: 1.271, conf: 4, disc: 4 },
        { assetId: gbp, dir: "SHORT", size: 6000, entry: 1.275, stop: 1.281, tp: 1.26, exit: 1.258, conf: 4, disc: 4 },
      ];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const entryTime = new Date(base + i * day + i * 3600 * 1000);
        const exitTime = new Date(entryTime.getTime() + (2 + i) * 3600 * 1000);
        await prisma.trade.create({
          data: {
            accountId: account.id,
            assetId: s.assetId,
            strategyId: strat?.id,
            emotionId: emo?.id,
            direction: s.dir,
            size: s.size,
            entryTime,
            entryPrice: s.entry,
            stopLoss: s.stop,
            takeProfit: s.tp,
            exitTime,
            exitPrice: s.exit,
            fees: 2,
            confidence: s.conf,
            discipline: s.disc,
            riskPct: 1,
            capitalUsagePct: 40,
            status: "CLOSED",
          },
        });
      }
      console.log(`Seeded ${samples.length} demo trades.`);
    }
  }

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
