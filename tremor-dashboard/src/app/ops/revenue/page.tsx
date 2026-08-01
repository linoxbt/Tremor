"use client";

import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { internalFetch } from "@/lib/api";
import { fmtUsd } from "@/lib/utils";
import { Card, CardHeader, ErrorBox, Loading } from "@/components/ui";

type Revenue = {
  days: number;
  by_endpoint: { endpoint: string; calls: number; revenue_usdc: number }[];
  by_day: { date: string; calls: number; revenue_usdc: number }[];
};

export default function OpsRevenuePage() {
  const { data, error, isLoading } = useSWR(
    "ops-revenue",
    () => internalFetch<Revenue>("/revenue?days=30"),
    { refreshInterval: 60_000 },
  );

  if (isLoading) return <Loading label="Loading revenue…" />;
  if (error) return <ErrorBox message={String(error.message || error)} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cs-dim">
          Operator
        </p>
        <h1 className="font-display text-2xl font-semibold text-white">Revenue</h1>
        <p className="text-sm text-cs-dim">
          Leaderboard sanity check from payments_log · last 30 days
        </p>
      </div>

      <Card>
        <CardHeader title="Daily USDC revenue" subtitle="Settled x402 amounts" />
        <div className="h-72 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.by_day}>
              <CartesianGrid stroke="#23232d" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b6760", fontSize: 10 }}
                minTickGap={30}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b6760", fontSize: 10 }}
                width={50}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#0e0e12",
                  border: "1px solid #23232d",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue_usdc" fill="#ff6b2c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="By endpoint" subtitle="Which routes earn the most" />
        <div className="overflow-x-auto">
          <table className="market-table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th className="text-right">Calls</th>
                <th className="text-right">Revenue USDC</th>
              </tr>
            </thead>
            <tbody>
              {data.by_endpoint.map((e) => (
                <tr key={e.endpoint} className="!cursor-default">
                  <td className="font-medium text-cs-accent">{e.endpoint}</td>
                  <td className="num text-right">{e.calls}</td>
                  <td className="num text-right">{fmtUsd(e.revenue_usdc, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
