export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTrades } from "@/lib/trades";
import { formatCurrency, formatNumber } from "@/lib/money";
import { prisma } from "@/lib/db";
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
import { Trash2 } from "lucide-react";
import { createMistake, deleteMistake } from "./actions";

export default async function MistakesPage() {
  const mistakes = await prisma.mistake.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { trades: { where: { trade: { deletedAt: null } } } } },
    },
  });

  const pending = await getTrades({ review: true });
  const reviewed = (await getTrades()).filter(
    (t) => t.row.notes || t.row.confidence != null || t.row.discipline != null,
  );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Review & lessons"
        description="Connect your results to your decisions. Build better trading habits."
      />

      <Card className="border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">
              {pending.length} trades waiting for review
            </h2>
            <p className="mt-1 text-sm text-muted">
              Record a lesson and score your execution to complete a review.
            </p>
          </div>
          <Link
            href="/trades?status=CLOSED&review=pending"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
          >
            Open review queue →
          </Link>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Trades with review details</p>
          <p className="mt-2 text-3xl font-semibold">{reviewed.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Mistake categories</p>
          <p className="mt-2 text-3xl font-semibold">{mistakes.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Review routine</p>
          <p className="mt-2 text-sm leading-6">
            Compare your plan with the outcome, then write one lesson for your
            next session.
          </p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Trade reflections</h2>
        {reviewed.length === 0 ? (
          <p className="text-sm text-muted">
            Add notes, confidence, or discipline to a trade to start your review
            history.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Trade</Th>
                <Th>Net P/L</Th>
                <Th>Planned / actual R</Th>
                <Th>Confidence / discipline</Th>
                <Th>Notes & lessons</Th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map(({ row, derived }) => (
                <tr key={row.id}>
                  <Td>
                    <Link
                      className="font-medium text-primary"
                      href={`/trades/${row.id}`}
                    >
                      {row.asset.symbol} ↗
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {row.entryTime.toISOString().slice(0, 10)}
                    </p>
                  </Td>
                  <Td>
                    {derived.isClosed
                      ? formatCurrency(derived.netPL, row.account.currency)
                      : "Open"}
                  </Td>
                  <Td>
                    {derived.plannedRRR == null
                      ? "—"
                      : formatNumber(derived.plannedRRR)}{" "}
                    /{" "}
                    {derived.actualRRR == null
                      ? "—"
                      : formatNumber(derived.actualRRR)}
                  </Td>
                  <Td>
                    {row.confidence ?? "—"} / {row.discipline ?? "—"}
                    <span className="ml-1 text-xs text-muted">out of 5</span>
                  </Td>
                  <Td className="max-w-sm whitespace-pre-wrap text-muted">
                    {row.notes || "No notes yet"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Add mistake</h2>
        <form action={createMistake} className="grid gap-3 md:grid-cols-3">
          <Field label="Name">
            <Input name="name" placeholder="Moved stop loss" required />
          </Field>
          <Field label="Description">
            <Input name="description" placeholder="Optional" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Mistake</Th>
              <Th>Description</Th>
              <Th className="text-right">Tagged trades</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {mistakes.map((m) => (
              <tr key={m.id}>
                <Td className="font-medium">{m.name}</Td>
                <Td className="text-muted">{m.description}</Td>
                <Td className="text-right">{m._count.trades}</Td>
                <Td className="text-right">
                  <form action={deleteMistake}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      aria-label="delete"
                      className="text-muted hover:text-negative"
                    >
                      <Trash2 size={15} />
                    </button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
