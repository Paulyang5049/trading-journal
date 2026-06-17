import { Decimal } from "decimal.js";

// Thin wrappers so money/price math never touches binary floats.
// Prisma returns Decimal-like objects (or strings); we normalize via .toString().

export type Numeric = number | string | Decimal | { toString(): string } | null | undefined;

export function dec(value: Numeric): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  if (value instanceof Decimal) return value;
  return new Decimal(value.toString());
}

export function add(...values: Numeric[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(dec(v)), new Decimal(0));
}

export function num(value: Numeric): number {
  return dec(value).toNumber();
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(value: Numeric, currency = "USD"): string {
  let fmt = currencyFormatters.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(currency, fmt);
  }
  return fmt.format(num(value));
}

export function formatPct(value: Numeric, digits = 2): string {
  return `${dec(value).toFixed(digits)}%`;
}

export function formatNumber(value: Numeric, digits = 2): string {
  return dec(value).toFixed(digits);
}
