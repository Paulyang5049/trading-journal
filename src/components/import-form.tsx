"use client";

import { useState } from "react";
import { parseTradesCsv, type ParsedTradeRow, type RowError } from "@/lib/import/parse";
import { deriveTrade } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/money";
import {
  Card,
  Button,
  Select,
  Field,
  Table,
  Th,
  Td,
  Badge,
  plClass,
} from "@/components/ui";

interface Option {
  id: string;
  label: string;
}

const PREVIEW_LIMIT = 25;

export function ImportForm({
  action,
  accounts,
}: {
  action: (form: FormData) => void;
  accounts: Option[];
}) {
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<ParsedTradeRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [fileName, setFileName] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseTradesCsv(text);
    setCsv(text);
    setRows(result.rows);
    setErrors(result.errors);
    setFileName(file.name);
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-2 text-lg font-semibold">Upload a CSV</h2>
        <p className="mb-4 text-sm text-muted">
          Column names are matched flexibly — generic, MetaTrader and IBKR exports
          all work. Recognised fields: symbol, direction, size, entry/exit time &amp;
          price, stop loss, take profit, fees, strategy, notes.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full text-sm file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
        />
      </Card>

      {fileName && (
        <Card>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Preview</h2>
              <p className="mt-1 text-sm text-muted">
                {fileName} · {rows.length} valid {rows.length === 1 ? "trade" : "trades"}
                {errors.length > 0 && ` · ${errors.length} skipped`}
              </p>
            </div>
            <form action={action} className="flex items-end gap-3">
              <input type="hidden" name="csv" value={csv} />
              <Field label="Import into account">
                <Select name="accountId" defaultValue={accounts[0]?.id} className="w-48" required>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" disabled={rows.length === 0}>
                Import {rows.length} {rows.length === 1 ? "trade" : "trades"}
              </Button>
            </form>
          </div>

          {errors.length > 0 && (
            <div className="mb-4 rounded-[var(--radius)] border border-negative/40 bg-negative/10 p-3 text-sm">
              <p className="mb-1 font-medium text-negative">Skipped rows</p>
              <ul className="space-y-0.5 text-muted">
                {errors.slice(0, 8).map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
                {errors.length > 8 && <li>…and {errors.length - 8} more</li>}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>Symbol</Th>
                  <Th>Dir</Th>
                  <Th>Size</Th>
                  <Th>Entry → Exit</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Net P/L</Th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_LIMIT).map((r, i) => {
                  const d = deriveTrade({
                    direction: r.direction,
                    size: r.size,
                    entryTime: r.entryTime,
                    entryPrice: r.entryPrice,
                    stopLoss: r.stopLoss,
                    takeProfit: r.takeProfit,
                    exitTime: r.exitTime,
                    exitPrice: r.exitPrice,
                    fees: r.fees,
                    status: r.exitPrice != null ? "CLOSED" : "OPEN",
                  });
                  return (
                    <tr key={i}>
                      <Td className="font-medium">{r.symbol}</Td>
                      <Td>
                        <Badge
                          className={
                            r.direction === "LONG"
                              ? "border-positive text-positive"
                              : "border-negative text-negative"
                          }
                        >
                          {r.direction}
                        </Badge>
                      </Td>
                      <Td>{formatNumber(r.size, 4)}</Td>
                      <Td className="text-muted">
                        {formatNumber(r.entryPrice, 4)}
                        {r.exitPrice != null ? ` → ${formatNumber(r.exitPrice, 4)}` : ""}
                      </Td>
                      <Td>{d.isClosed ? "Closed" : "Open"}</Td>
                      <Td className={`text-right font-medium ${plClass(d.netPL)}`}>
                        {d.isClosed ? formatCurrency(d.netPL) : "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {rows.length > PREVIEW_LIMIT && (
            <p className="mt-2 text-xs text-muted">
              Showing first {PREVIEW_LIMIT} of {rows.length}. All {rows.length} will be imported.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
