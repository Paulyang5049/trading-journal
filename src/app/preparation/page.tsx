export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { num } from "@/lib/money";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Field,
  Table,
  Th,
  Td,
} from "@/components/ui";
import { PositionCalculator } from "@/components/position-calculator";
import { Trash2 } from "lucide-react";
import { createWatchlistItem, deleteWatchlistItem } from "./actions";

export default async function PreparationPage() {
  const items = await prisma.watchlistItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Preparation" description="Your watchlist and calculator." />

      <PositionCalculator />

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Add to watchlist</h2>
        <form action={createWatchlistItem} className="grid gap-3 md:grid-cols-3">
          <Field label="Symbol">
            <Input name="symbol" placeholder="EURUSD" required />
          </Field>
          <Field label="Current price">
            <Input name="currentPrice" type="number" step="any" />
          </Field>
          <Field label="Goal">
            <Input name="goal" placeholder="Setup / target" />
          </Field>
          <Field label="Technicals">
            <Input name="technicals" />
          </Field>
          <Field label="Fundamentals">
            <Input name="fundamentals" />
          </Field>
          <Field label="Risk:Reward">
            <Input name="riskReward" placeholder="e.g. 1:3" />
          </Field>
          <Field label="News">
            <Input name="news" />
          </Field>
          <Field label="Source">
            <Input name="source" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Watchlist</h2>
        {items.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Symbol</Th>
                <Th>Price</Th>
                <Th>Goal</Th>
                <Th>Technicals</Th>
                <Th>R:R</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <Td className="font-medium">{w.symbol}</Td>
                  <Td>{w.currentPrice != null ? num(w.currentPrice) : "—"}</Td>
                  <Td className="text-muted">{w.goal}</Td>
                  <Td className="text-muted">{w.technicals}</Td>
                  <Td>{w.riskReward}</Td>
                  <Td className="text-right">
                    <form action={deleteWatchlistItem}>
                      <input type="hidden" name="id" value={w.id} />
                      <button aria-label="delete" className="text-muted hover:text-negative">
                        <Trash2 size={15} />
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-muted">Your watchlist is empty.</p>
        )}
      </Card>
    </div>
  );
}