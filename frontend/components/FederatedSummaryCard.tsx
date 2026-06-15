// frontend/components/FederatedSummaryCard.tsx
// NEW FILE — kopyala yapıştır, hiçbir düzenleme gerekmez.

"use client";

import { Network, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { FederatedSummary, FedRound } from "../app/types";

interface Props {
  data: FederatedSummary | null;
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function MetricPill({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: string;
  color?: "blue" | "green" | "amber";
}) {
  const colors: Record<string, string> = {
    blue:  "bg-[#0c4c8f]/10 text-[#0c4c8f] border-[#0c4c8f]/20",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${colors[color]}`}>
      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
      <p className="text-sm font-bold font-mono">{value}</p>
    </div>
  );
}

export function FederatedSummaryCard({ data }: Props) {
  const [showRounds, setShowRounds] = useState(false);

  if (!data) {
    return (
      <div className="bg-white border border-[#0c4c8f]/20 rounded-xl p-5 shadow-sm animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    );
  }

  const macroF1    = data.final_macro_f1 ?? 0;
  const macroColor = macroF1 >= 0.74 ? "green" : macroF1 >= 0.5 ? "amber" : "blue";

  const trainSamples   = data.train_samples ?? 0;
  const holdoutSamples = data.holdout_samples ?? 0;

  return (
    <div className="bg-white border border-[#0c4c8f]/20 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#0c4c8f]/15 bg-[#0c4c8f]/[0.03]">
        <div className="flex items-center gap-2">
          <Network size={15} className="text-[#0c4c8f]" />
          <span className="text-sm font-semibold text-[#0c4c8f]">
            Federated Learning — FedAvg Simulation
          </span>
        </div>
        <span className="text-[10px] text-slate-500 border border-slate-200 rounded px-2 py-0.5">
          Offline · {data.mode ?? "FedAvg"}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Config row */}
        <div className="flex flex-wrap gap-3">
          <MetricPill label="Clients"       value={String(data.clients ?? 5)} />
          <MetricPill label="Rounds"        value={String(data.rounds ?? 5)} />
          <MetricPill label="Local Epochs"  value={String(data.local_epochs ?? 2)} />
          <MetricPill label="Features"      value={String(data.n_features ?? 45)} />
          <MetricPill label="Partition"     value={(data.iid_split ?? true) ? "IID" : "Non-IID"} />
        </div>

        {/* Sample counts */}
        <div className="flex flex-wrap gap-3">
          <MetricPill
            label="Train Samples"
            value={trainSamples > 0 ? trainSamples.toLocaleString() : "—"}
          />
          <MetricPill
            label="Holdout Samples"
            value={holdoutSamples > 0 ? holdoutSamples.toLocaleString() : "—"}
          />
        </div>

        {/* Final metrics */}
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">
            Final Holdout Performance (Round {data.rounds ?? 5})
          </p>
          <div className="flex flex-wrap gap-3">
            <MetricPill label="Accuracy"    value={pct(data.final_accuracy)}    color="green" />
            <MetricPill label="Weighted F1" value={pct(data.final_weighted_f1)} color="green" />
            <MetricPill label="Macro F1"    value={pct(data.final_macro_f1)}    color={macroColor} />
          </div>
        </div>

        {/* Model info note */}
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>
            <span className="font-medium text-slate-700">Model:</span>{" "}
            {data.model_type ?? "3-layer MLP"} — simulated across{" "}
            {data.clients ?? 5} virtual clients without sharing raw data
            partitions during FedAvg aggregation.
          </span>
        </div>

        {/* Round history toggle */}
        {data.round_history && data.round_history.length > 0 && (
          <div>
            <button
              onClick={() => setShowRounds((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-[#0c4c8f] hover:underline"
            >
              {showRounds ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showRounds ? "Hide" : "Show"} round-by-round convergence
            </button>

            {showRounds && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#0c4c8f]/15">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0c4c8f]/[0.04] text-[#0c4c8f]">
                    <tr>
                      {["Round", "Accuracy", "Weighted F1", "Macro F1"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 font-semibold uppercase tracking-widest text-[10px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.round_history.map((r: FedRound) => {
                      const isFinal = r.round === (data.rounds ?? 5);
                      return (
                        <tr
                          key={r.round}
                          className={`border-t border-[#0c4c8f]/10 ${
                            isFinal ? "bg-emerald-50" : "bg-white"
                          }`}
                        >
                          <td className="px-3 py-2 font-mono font-semibold text-[#0c4c8f]">
                            {isFinal ? `${r.round} ★` : r.round}
                          </td>
                          <td className="px-3 py-2 font-mono">{pct(r.accuracy)}</td>
                          <td className="px-3 py-2 font-mono">{pct(r.f1_weighted)}</td>
                          <td
                            className={`px-3 py-2 font-mono font-semibold ${
                              isFinal ? "text-emerald-700" : "text-slate-700"
                            }`}
                          >
                            {pct(r.f1_macro)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer note */}
        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
          <span className="font-medium text-slate-500">Note:</span>{" "}
          Offline federated learning simulation. The dashboard reports final FedAvg
          evaluation metrics; it does not perform live distributed training in this
          prototype.
        </p>
      </div>
    </div>
  );
}
