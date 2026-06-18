# Contributing

Thanks for your interest in improving Trading Journal!

## Development setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Before opening a PR

- `npm run lint` — no errors
- `npm test` — all unit tests pass
- `npm run build` — production build succeeds

If you change anything in `src/lib/analytics/` or `src/lib/calc/`, add or update the
matching `*.test.ts` so the formulas stay verified.

## Guidelines

- Keep money/price math in `decimal.js` (`src/lib/money.ts`) — never raw `number`
  arithmetic for currency.
- Derived trade values (P/L, RRR, duration) are computed on read in
  `src/lib/analytics`; don't persist them to the database.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages
  (e.g. `feat: add CSV import`, `fix: correct drawdown calc`).

## Reporting bugs

Open an issue with steps to reproduce, expected vs. actual behaviour, and your
environment (OS, Node version).
