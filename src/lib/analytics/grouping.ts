import type { DerivedTrade } from "./types";

export interface GroupStat {
  key: string;
  trades: number;
  wins: number;
  winRate: number;
  netPL: number;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

interface Keyed {
  derived: DerivedTrade;
  entryTime: Date;
  key?: string | null;
}

function group(items: Keyed[], keyFn: (i: Keyed) => string): GroupStat[] {
  const map = new Map<string, GroupStat>();
  for (const item of items) {
    if (!item.derived.isClosed) continue;
    const key = keyFn(item);
    const g =
      map.get(key) ?? { key, trades: 0, wins: 0, winRate: 0, netPL: 0 };
    g.trades += 1;
    if (item.derived.outcome === "WIN") g.wins += 1;
    g.netPL += item.derived.netPL;
    map.set(key, g);
  }
  for (const g of map.values()) {
    g.winRate = g.trades ? (g.wins / g.trades) * 100 : 0;
  }
  return [...map.values()];
}

export function byDayOfWeek(items: Keyed[]): GroupStat[] {
  const stats = group(items, (i) => DAY_NAMES[i.entryTime.getDay()]);
  // Preserve Mon..Sun ordering with zero-filled gaps.
  const order = [...DAY_NAMES.slice(1), DAY_NAMES[0]];
  return order.map(
    (d) =>
      stats.find((s) => s.key === d) ?? {
        key: d,
        trades: 0,
        wins: 0,
        winRate: 0,
        netPL: 0,
      },
  );
}

export function byHour(items: Keyed[]): GroupStat[] {
  const stats = group(items, (i) =>
    String(i.entryTime.getHours()).padStart(2, "0"),
  );
  return Array.from({ length: 24 }, (_, h) => {
    const key = String(h).padStart(2, "0");
    return (
      stats.find((s) => s.key === key) ?? {
        key,
        trades: 0,
        wins: 0,
        winRate: 0,
        netPL: 0,
      }
    );
  });
}

export function byKey(items: Keyed[]): GroupStat[] {
  return group(items, (i) => i.key ?? "—").sort((a, b) => b.netPL - a.netPL);
}
