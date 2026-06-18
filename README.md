# Trading Journal

A free, open-source, self-hostable trading journal & analytics app — a lightweight
alternative to tools like [Tradervue](https://www.tradervue.com/). Log your trades,
attach chart screenshots, tag mistakes and emotions, and see your performance broken
down by win rate, R-multiple, drawdown, day-of-week, time-of-day, asset and strategy.

Built as a single Next.js app with a local SQLite database, so you can run it on your
own machine with zero external services.

## Features

- **Trading Log** — log open/closed positions with live-computed P/L, RRR and duration; per-trade notes, chart screenshots, emotion, confidence/discipline scores and mistake tags.
- **Dashboard** — net P/L, win rate, profit factor, expectancy, max drawdown, equity curve, P/L distribution, day-of-week & hour-of-day breakdowns, and per-asset / per-strategy performance.
- **Account Capital** — track deposits/withdrawals and an equity curve per account.
- **Preparation** — a watchlist and a position-size / risk calculator.
- **Setup** — manage accounts, assets, strategies, emotions, mistakes and goals.
- Dark / light theme.

All monetary math runs through `decimal.js` (no binary-float rounding), and every
analytics formula is a pure function covered by unit tests.

## Tech stack

Next.js 16 (App Router) · TypeScript · Prisma 7 + SQLite · Tailwind CSS v4 · Recharts · Vitest

## Quickstart

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
npx prisma migrate dev      # create the SQLite database
npm run db:seed             # optional: demo account + sample trades
npm run dev                 # http://localhost:3000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Run the unit tests (analytics + calculator) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed default data + demo trades |
| `npm run lint` | Lint |

## Data & storage

- The database is a single SQLite file (`dev.db`) at the project root — easy to back up.
- Uploaded screenshots are stored under `public/uploads/`.
- To use PostgreSQL instead, see the notes in [`.env.example`](.env.example).

## Roadmap

- Multi-user accounts + authentication
- CSV import (MT4/5, IBKR, TradingView, …) and broker API sync
- Shareable / public trade links
- Mobile PWA
- AI-assisted trade review

## Contributing

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
