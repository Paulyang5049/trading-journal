import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deriveTrade } from "@/lib/analytics";
import { toTradeInput } from "@/lib/trades";
import { formatCurrency, formatNumber } from "@/lib/money";
import { formatDateTime, formatDuration } from "@/lib/format";
import {
  PageHeader,
  Button,
  Card,
  Badge,
  Field,
  Input,
  Select,
  plClass,
} from "@/components/ui";
import { Trash2 } from "lucide-react";
import { deleteTrade, uploadScreenshot, deleteScreenshot } from "../actions";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: {
      account: true,
      asset: true,
      strategy: true,
      emotion: true,
      screenshots: true,
      mistakes: { include: { mistake: true } },
    },
  });
  if (!trade) notFound();

  const derived = deriveTrade(toTradeInput(trade));
  const currency = trade.account.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${trade.asset.symbol} ${trade.direction}`}
        description={`${trade.account.name} · ${formatDateTime(trade.entryTime)}`}
        actions={
          <div className="flex gap-2">
            <Link href={`/trades/${trade.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <form action={deleteTrade}>
              <input type="hidden" name="id" value={trade.id} />
              <Button variant="danger">Delete</Button>
            </form>
          </div>
        }
      />

      {/* Outcome summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Status" value={trade.status === "CLOSED" ? "Closed" : "Open"} />
        <Stat
          label="Net P/L"
          value={derived.isClosed ? formatCurrency(derived.netPL, currency) : "—"}
          className={plClass(derived.netPL)}
        />
        <Stat
          label="Net P/L %"
          value={derived.isClosed ? `${formatNumber(derived.netPLPct)}%` : "—"}
          className={plClass(derived.netPL)}
        />
        <Stat
          label="Actual RRR"
          value={derived.actualRRR != null ? formatNumber(derived.actualRRR) : "—"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Position</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Direction" value={trade.direction} />
            <Row label="Size" value={formatNumber(Number(trade.size), 4)} />
            <Row label="Entry price" value={formatNumber(Number(trade.entryPrice), 4)} />
            <Row
              label="Stop loss"
              value={trade.stopLoss != null ? formatNumber(Number(trade.stopLoss), 4) : "—"}
            />
            <Row
              label="Take profit"
              value={trade.takeProfit != null ? formatNumber(Number(trade.takeProfit), 4) : "—"}
            />
            <Row
              label="Exit price"
              value={trade.exitPrice != null ? formatNumber(Number(trade.exitPrice), 4) : "—"}
            />
            <Row label="Fees" value={formatCurrency(Number(trade.fees), currency)} />
            <Row
              label="Planned RRR"
              value={derived.plannedRRR != null ? formatNumber(derived.plannedRRR) : "—"}
            />
            <Row label="Duration" value={formatDuration(derived.durationMin)} />
            <Row label="Exit time" value={formatDateTime(trade.exitTime)} />
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Review</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Strategy" value={trade.strategy?.name ?? "—"} />
            <Row label="Emotion" value={trade.emotion?.name ?? "—"} />
            <Row label="Confidence" value={trade.confidence ? `${trade.confidence}/5` : "—"} />
            <Row label="Discipline" value={trade.discipline ? `${trade.discipline}/5` : "—"} />
            <Row label="% Risk" value={trade.riskPct != null ? `${trade.riskPct}%` : "—"} />
            <Row
              label="% Capital"
              value={trade.capitalUsagePct != null ? `${trade.capitalUsagePct}%` : "—"}
            />
          </dl>
          {trade.mistakes.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted">Mistakes</p>
              <div className="flex flex-wrap gap-2">
                {trade.mistakes.map((m) => (
                  <Badge key={m.mistakeId} className="border-negative text-negative">
                    {m.mistake.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {trade.notes && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted">Notes</p>
              <p className="whitespace-pre-wrap text-sm">{trade.notes}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Screenshots */}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Charts &amp; screenshots</h2>
        {trade.screenshots.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3">
            {trade.screenshots.map((sc) => (
              <div key={sc.id} className="overflow-hidden rounded-[var(--radius)] border">
                <Image
                  src={sc.url}
                  alt={sc.caption ?? "screenshot"}
                  width={400}
                  height={260}
                  className="h-40 w-full object-cover"
                  unoptimized
                />
                <div className="flex items-center justify-between px-2 py-1.5 text-xs">
                  <span className="text-muted">
                    {sc.kind}
                    {sc.caption ? ` · ${sc.caption}` : ""}
                  </span>
                  <form action={deleteScreenshot}>
                    <input type="hidden" name="id" value={sc.id} />
                    <input type="hidden" name="tradeId" value={trade.id} />
                    <button aria-label="delete" className="text-muted hover:text-negative">
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
        <form
          action={uploadScreenshot}
          className="grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end"
        >
          <input type="hidden" name="tradeId" value={trade.id} />
          <Field label="Image">
            <Input type="file" name="file" accept="image/*" required />
          </Field>
          <Field label="Kind">
            <Select name="kind" defaultValue="POST">
              <option value="PRE">Pre-trade</option>
              <option value="DURING">During</option>
              <option value="POST">Post-trade</option>
            </Select>
          </Field>
          <Field label="Caption">
            <Input name="caption" placeholder="Optional" />
          </Field>
          <Button type="submit" variant="secondary">
            Upload
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${className ?? ""}`}>{value}</p>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
