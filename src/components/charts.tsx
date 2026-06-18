"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

const AXIS = "var(--muted)";
const GRID = "var(--border)";
const POS = "var(--positive)";
const NEG = "var(--negative)";
const PRIMARY = "var(--primary)";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};

export function EquityChart({
  data,
}: {
  data: { label: string; equity: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} minTickGap={24} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          width={64}
          domain={[
            (min: number) => Math.floor(min * 0.98),
            (max: number) => Math.ceil(max * 1.02),
          ]}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={PRIMARY}
          strokeWidth={2}
          fill="url(#equityFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Bar chart coloured by sign of the value. */
export function SignedBarChart({
  data,
  height = 240,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} interval={0} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={56} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
        <ReferenceLine y={0} stroke={GRID} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? POS : NEG} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-colour bar chart (e.g. win-rate %). */
export function BarChartSimple({
  data,
  height = 240,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} interval={0} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} width={44} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} />
        <Bar dataKey="value" fill={PRIMARY} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
