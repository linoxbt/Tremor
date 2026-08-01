"use client";

import useSWR from "swr";
import { Fragment, useState } from "react";
import { internalFetch } from "@/lib/api";
import { Badge, Card, CardHeader, ErrorBox, Loading } from "@/components/ui";

type Flag = {
  id: string;
  token_address: string;
  symbol: string | null;
  name: string | null;
  flag_type: string;
  severity: string;
  detected_at: string;
  details: unknown;
};

export default function OpsRiskPage() {
  const { data, error, isLoading } = useSWR(
    "ops-risk",
    () => internalFetch<Flag[]>("/risk"),
    { refreshInterval: 60_000 },
  );
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) return <Loading label="Loading risk flags…" />;
  if (error) return <ErrorBox message={String(error.message || error)} />;

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cs-dim">
          Operator
        </p>
        <h1 className="font-display text-2xl font-semibold text-white">Risk flags</h1>
        <p className="text-sm text-cs-dim">
          Active risk_flags · {rows.length} open
        </p>
      </div>

      <Card>
        <CardHeader title="Flagged tokens" subtitle="Click for details JSON" />
        <div className="overflow-x-auto">
          <table className="market-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Flag</th>
                <th>Severity</th>
                <th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const tone =
                  f.severity === "high"
                    ? "red"
                    : f.severity === "medium"
                      ? "amber"
                      : "neutral";
                const isOpen = open === f.id;
                return (
                  <Fragment key={f.id}>
                    <tr onClick={() => setOpen(isOpen ? null : f.id)}>
                      <td>
                        <div className="font-medium text-cs-accent">{f.symbol || "—"}</div>
                        <div className="text-[11px] text-cs-dim">
                          {f.name} · {f.token_address}
                        </div>
                      </td>
                      <td>{f.flag_type}</td>
                      <td>
                        <Badge tone={tone}>{f.severity}</Badge>
                      </td>
                      <td className="num text-cs-dim">
                        {new Date(f.detected_at).toLocaleString()}
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="!cursor-default">
                        <td colSpan={4} className="!bg-cs-bg">
                          <pre className="overflow-auto p-2 text-[11px] text-cs-dim">
                            {JSON.stringify(f.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
