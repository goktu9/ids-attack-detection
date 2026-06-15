// frontend/app/federated/page.tsx — NEW FILE (new folder)

"use client";

import { useState, useEffect } from "react";
import {
  Network, CheckCircle2, ChevronDown, ChevronUp,
  Users, RotateCcw, Cpu, Database, TrendingUp,
} from "lucide-react";
import { fetchFederatedSummary } from "../api";
import type { FederatedSummary, FedRound } from "../types";

function pct(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function BigMetric({ label, value, sub, color = "blue" }: {
  label: string; value: string; sub?: string;
  color?: "blue" | "green" | "amber";
}) {
  const colors = {
    blue:  "text-[#0c4c8f]",
    green: "text-emerald-600",
    amber: "text-amber-600",
  };
  return (
    <div className="bg-white border border-[#0c4c8f]/20 rounded-xl p-5 shadow-sm">
      <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-bold font-mono tabular-nums ${colors[color]}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function ConfigPill({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-white border border-[#0c4c8f]/15 rounded-lg px-4 py-2.5 shadow-sm">
      <Icon size={14} className="text-[#0c4c8f] shrink-0" />
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

export default function FederatedPage() {
  const [data,       setData]       = useState<FederatedSummary | null>(null);
  const [showRounds, setShowRounds] = useState(true);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    fetchFederatedSummary()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm animate-pulse">
          Loading federated learning results…
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <Network size={28} className="text-slate-300" />
          <p className="text-slate-500 text-sm">Could not load federated learning data.</p>
          <p className="text-slate-400 text-xs">Make sure the backend is running and /federated/summary is reachable.</p>
        </div>
      </main>
    );
  }

  const macroColor = (data.final_macro_f1 ?? 0) >= 0.74 ? "green"
    : (data.final_macro_f1 ?? 0) >= 0.5 ? "amber" : "blue";

  // For mini sparkline using round history
  const rounds = data.round_history ?? [];
  const maxMacro = Math.max(...rounds.map(r => r.f1_macro), 0.01);

  return (
    <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-[#0c4c8f]/15 bg-white px-5 py-4 shadow-sm flex items-start gap-3">
        <Network size={18} className="text-[#0c4c8f] shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-[#0c4c8f]">
            Federated Learning — FedAvg Simulation
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-3xl">
            {data.note}
          </p>
        </div>
        <span className="ml-auto shrink-0 text-[10px] border border-slate-200 rounded px-2 py-1 text-slate-500 bg-slate-50">
          Offline · {data.mode}
        </span>
      </div>

      {/* Final metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BigMetric label="Final Accuracy"    value={pct(data.final_accuracy)}    sub="Round 5 holdout" color="green" />
        <BigMetric label="Weighted F1"       value={pct(data.final_weighted_f1)} sub="Round 5 holdout" color="green" />
        <BigMetric label="Macro F1"          value={pct(data.final_macro_f1)}    sub="Equal-weight avg across 12 classes" color={macroColor} />
      </div>

      {/* Config pills */}
      <div className="flex flex-wrap gap-3">
        <ConfigPill icon={Users}     label="Clients"       value={String(data.clients ?? 5)} />
        <ConfigPill icon={RotateCcw} label="Rounds"        value={String(data.rounds ?? 5)} />
        <ConfigPill icon={Cpu}       label="Local Epochs"  value={String(data.local_epochs ?? 2)} />
        <ConfigPill icon={Network}   label="Aggregation"   value="FedAvg (sample-weighted)" />
        <ConfigPill icon={Database}  label="Partition"     value={(data.iid_split ?? true) ? "IID" : "Non-IID"} />
        <ConfigPill icon={TrendingUp} label="Features"     value={`${data.n_features ?? 45} flow features`} />
        <ConfigPill icon={Database}  label="Train Samples" value={(data.train_samples ?? 0).toLocaleString()} />
        <ConfigPill icon={Database}  label="Holdout"       value={(data.holdout_samples ?? 0).toLocaleString()} />
      </div>

      {/* Model info */}
      <div className="flex items-start gap-2 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm text-xs text-slate-600">
        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold text-slate-700">Model architecture:</span>{" "}
          {data.model_type ?? "3-layer MLP"} — trained across {data.clients ?? 5} virtual clients
          without sharing raw data partitions. Raw network traffic data never left each client partition
          during the FedAvg aggregation process.
        </span>
      </div>

      {/* Round-by-round table + mini bar chart */}
      {rounds.length > 0 && (
        <div className="bg-white border border-[#0c4c8f]/20 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShowRounds(s => !s)}
            className="w-full flex items-center justify-between px-5 py-3 border-b border-[#0c4c8f]/15 bg-[#0c4c8f]/[0.03] hover:bg-[#0c4c8f]/[0.06] transition-colors"
          >
            <p className="text-[11px] font-semibold text-[#0c4c8f] uppercase tracking-widest">
              Round-by-Round Convergence
            </p>
            {showRounds ? <ChevronUp size={14} className="text-[#0c4c8f]" /> : <ChevronDown size={14} className="text-[#0c4c8f]" />}
          </button>

          {showRounds && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0c4c8f]/[0.04] text-[#0c4c8f]">
                  <tr>
                    {["Round", "Accuracy", "Precision (W)", "Recall (W)", "Weighted F1", "Macro F1", "Progress"].map(h => (
                      <th key={h} className="px-4 py-2.5 font-semibold uppercase tracking-widest text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((r: FedRound) => {
                    const isFinal = r.round === (data.rounds ?? 5);
                    const barPct  = Math.round((r.f1_macro / maxMacro) * 100);
                    return (
                      <tr key={r.round} className={`border-t border-[#0c4c8f]/10 ${isFinal ? "bg-emerald-50" : "bg-white"}`}>
                        <td className="px-4 py-3 font-mono font-bold text-[#0c4c8f]">
                          {isFinal ? `${r.round} ★` : r.round}
                        </td>
                        <td className="px-4 py-3 font-mono">{pct(r.accuracy)}</td>
                        <td className="px-4 py-3 font-mono">{pct(r.precision_weighted)}</td>
                        <td className="px-4 py-3 font-mono">{pct(r.recall_weighted)}</td>
                        <td className="px-4 py-3 font-mono">{pct(r.f1_weighted)}</td>
                        <td className={`px-4 py-3 font-mono font-bold ${isFinal ? "text-emerald-700" : "text-slate-700"}`}>
                          {pct(r.f1_macro)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isFinal ? "bg-emerald-400" : "bg-[#38b6ff]"}`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{barPct}%</span>
                          </div>
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

      {/* Academic note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800">
        <span className="font-semibold">Academic note:</span>{" "}
        This simulation uses IID client partitioning, which represents an idealized federated scenario.
        Real-world federated IDS deployments would involve non-IID data distributions, heterogeneous
        client capabilities, and communication-cost tradeoffs — identified as directions for future work.
      </div>
    </main>
  );
}
