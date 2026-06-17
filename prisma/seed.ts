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

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
