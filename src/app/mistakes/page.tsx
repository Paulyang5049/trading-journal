export const dynamic = "force-dynamic";

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
    include: { _count: { select: { trades: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Mistake Log"
        description="Track recurring mistakes and how often they bite."
      />

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
                    <button aria-label="delete" className="text-muted hover:text-negative">
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