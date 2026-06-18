export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { num, formatCurrency } from "@/lib/money";
import {
  Card,
  PageHeader,
  Button,
  Input,
  Select,
  Field,
  Table,
  Th,
  Td,
  Badge,
} from "@/components/ui";
import { Trash2 } from "lucide-react";
import {
  createAccount,
  deleteAccount,
  createAsset,
  deleteAsset,
  createStrategy,
  deleteStrategy,
  createEmotion,
  deleteEmotion,
  updateSettings,
} from "./actions";

const ASSET_CLASSES = ["Forex", "Stocks", "Crypto", "Futures", "Other"];

function DeleteForm({ action, id }: { action: (f: FormData) => void; id: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button variant="ghost" className="h-8 w-8 px-0" aria-label="Delete">
        <Trash2 size={15} />
      </Button>
    </form>
  );
}

export default async function SettingsPage() {
  const [accounts, assets, strategies, emotions, settings] = await Promise.all([
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.asset.findMany({ include: { account: true }, orderBy: { symbol: "asc" } }),
    prisma.strategy.findMany({ orderBy: { name: "asc" } }),
    prisma.emotion.findMany({ orderBy: { score: "desc" } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Setup"
        description="Configure accounts, assets, strategies, emotions and goals."
      />

      {/* Goals */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Goals &amp; currency</h2>
        <form
          action={updateSettings}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          <Field label="Base currency">
            <Input name="currency" defaultValue={settings?.currency ?? "USD"} />
          </Field>
          <Field label="Max drawdown %">
            <Input
              name="maxDrawdownPct"
              type="number"
              step="0.1"
              defaultValue={settings?.maxDrawdownPct ?? 10}
            />
          </Field>
          <Field label="Profit target %">
            <Input
              name="profitTargetPct"
              type="number"
              step="0.1"
              defaultValue={settings?.profitTargetPct ?? 20}
            />
          </Field>
          <Field label="Win rate target %">
            <Input
              name="winRatePct"
              type="number"
              step="0.1"
              defaultValue={settings?.winRatePct ?? 50}
            />
          </Field>
          <div className="col-span-2 md:col-span-4">
            <Button type="submit">Save goals</Button>
          </div>
        </form>
      </Card>

      {/* Accounts */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Accounts</h2>
        <form
          action={createAccount}
          className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5"
        >
          <Field label="Name">
            <Input name="name" placeholder="My FX account" required />
          </Field>
          <Field label="Class">
            <Select name="assetClass" defaultValue="Forex">
              {ASSET_CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Currency">
            <Input name="currency" defaultValue="USD" />
          </Field>
          <Field label="Starting capital">
            <Input name="startingCapital" type="number" step="0.01" defaultValue={0} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add
            </Button>
          </div>
        </form>
        {accounts.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Class</Th>
                <Th>Currency</Th>
                <Th>Starting capital</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <Td className="font-medium">{a.name}</Td>
                  <Td>{a.assetClass}</Td>
                  <Td>{a.currency}</Td>
                  <Td>{formatCurrency(num(a.startingCapital), a.currency)}</Td>
                  <Td className="text-right">
                    <DeleteForm action={deleteAccount} id={a.id} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-muted">No accounts yet.</p>
        )}
      </Card>

      {/* Assets */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Assets</h2>
        <form
          action={createAsset}
          className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"
        >
          <Field label="Symbol">
            <Input name="symbol" placeholder="EURUSD" required />
          </Field>
          <Field label="Class">
            <Select name="assetClass" defaultValue="Forex">
              {ASSET_CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Account (optional)">
            <Select name="accountId" defaultValue="">
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add
            </Button>
          </div>
        </form>
        {assets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assets.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 rounded-full border bg-surface-2 px-3 py-1 text-sm"
              >
                <span className="font-medium">{a.symbol}</span>
                <span className="text-xs text-muted">{a.assetClass}</span>
                <DeleteForm action={deleteAsset} id={a.id} />
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No assets yet.</p>
        )}
      </Card>

      {/* Strategies */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Strategies</h2>
        <form
          action={createStrategy}
          className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          <Field label="Name">
            <Input name="name" placeholder="Breakout" required />
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
        <div className="flex flex-wrap gap-2">
          {strategies.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-2 rounded-full border bg-surface-2 px-3 py-1 text-sm"
            >
              {s.name}
              <DeleteForm action={deleteStrategy} id={s.id} />
            </span>
          ))}
        </div>
      </Card>

      {/* Emotions */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Emotional states</h2>
        <form
          action={createEmotion}
          className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4"
        >
          <Field label="Name">
            <Input name="name" placeholder="Confident" required />
          </Field>
          <Field label="Score (-5..5)">
            <Input name="score" type="number" min={-5} max={5} defaultValue={0} />
          </Field>
          <Field label="Explanation">
            <Input name="explanation" placeholder="Optional" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add
            </Button>
          </div>
        </form>
        <Table>
          <thead>
            <tr>
              <Th>Emotion</Th>
              <Th>Score</Th>
              <Th>Explanation</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {emotions.map((e) => (
              <tr key={e.id}>
                <Td className="font-medium">{e.name}</Td>
                <Td>
                  <Badge
                    className={
                      e.score > 0
                        ? "border-positive text-positive"
                        : e.score < 0
                          ? "border-negative text-negative"
                          : "text-muted"
                    }
                  >
                    {e.score > 0 ? `+${e.score}` : e.score}
                  </Badge>
                </Td>
                <Td className="text-muted">{e.explanation}</Td>
                <Td className="text-right">
                  <DeleteForm action={deleteEmotion} id={e.id} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}