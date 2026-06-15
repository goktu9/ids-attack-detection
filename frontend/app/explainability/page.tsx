// frontend/app/explainability/page.tsx — NEW FILE (new folder)

"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, RefreshCw, TrendingUp, TrendingDown, Info } from "lucide-react";
import { fetchStream, fetchHistory } from "../api";
import { XaiCard } from "../../components/XaiCard";
import type { StreamEvent } from "../types";

const ATTACK_COLORS: Record<string, string> = {
  "DoS Hulk":               "bg-red-100 text-red-700 border-red-200",
  "DDoS":                   "bg-red-100 text-red-700 border-red-200",
  "DoS GoldenEye":          "bg-orange-100 text-orange-700 border-orange-200",
  "DoS slowloris":          "bg-orange-100 text-orange-700 border-orange-200",
  "DoS Slowhttptest":       "bg-orange-100 text-orange-700 border-orange-200",
  "PortScan":               "bg-amber-100 text-amber-700 border-amber-200",
  "FTP-Patator":            "bg-amber-100 text-amber-700 border-amber-200",
  "SSH-Patator":            "bg-amber-100 text-amber-700 border-amber-200",
  "Bot":                    "bg-purple-100 text-purple-700 border-purple-200",
  "Web Attack - Brute Force": "bg-pink-100 text-pink-700 border-pink-200",
  "Web Attack - XSS":       "bg-pink-100 text-pink-700 border-pink-200",
};

function SHAPBar({ value, max }: { value: number; max: number }) {
  const isPos = value >= 0;
  const pct   = Math.round((Math.abs(value) / Math.max(max, 0.001)) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isPos ? "bg-red-400" : "bg-[#38b6ff]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono font-bold ${isPos ? "text-red-600" : "text-[#0c4c8f]"}`}>
        {isPos ? "+" : ""}{value.toFixed(4)}
      </span>
    </div>
  );
}

export default function ExplainabilityPage() {
  const [attackEvents, setAttackEvents] = useState<StreamEvent[]>([]);
  const [selected,     setSelected]     = useState<StreamEvent | null>(null);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    try {
      const resp = await fetchHistory(30);
      const attacks = resp.items.filter(e => e.prediction_binary === 1 && e.reasoning?.length > 0);
      setAttackEvents(attacks);
      if (attacks.length > 0 && !selected) setSelected(attacks[0]);
    } catch {/* silent */}
    finally { setLoading(false); }
  }, [selected]);

  useEffect(() => { load(); }, []);

  // Also trigger a stream fetch so we always have fresh data
  useEffect(() => {
    fetchStream().catch(() => {});
  }, []);

  const maxShap = selected
    ? Math.max(...(selected.reasoning ?? []).map(r => Math.abs(r.shap_value)), 0.001)
    : 0.001;

  return (
    <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-[#0c4c8f]/15 bg-white px-5 py-4 shadow-sm flex items-start gap-3">
        <Brain size={18} className="text-[#0c4c8f] shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-[#0c4c8f]">XAI Explorer — SHAP Explanations</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Per-sample SHAP values computed by TreeExplainer for the multiclass Random Forest.
            Contributions reflect the predicted attack class. This supports analyst interpretation — not causal proof.
          </p>
        </div>
        <button
          onClick={load}
          className="ml-auto shrink-0 flex items-center gap-1.5 text-xs text-[#0c4c8f] border border-[#0c4c8f]/20 rounded-lg px-3 py-1.5 hover:bg-[#0c4c8f]/10 transition-colors"
        >
          <RefreshCw size={12} />Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm animate-pulse">
          Loading attack events…
        </div>
      ) : attackEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <Brain size={28} className="text-[#0c4c8f]/30" />
          <p className="text-slate-500 text-sm">No attack events with SHAP data yet.</p>
          <p className="text-slate-400 text-xs">Wait for the dashboard to detect an attack, then refresh.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Event list */}
          <div className="lg:col-span-1 bg-white border border-[#0c4c8f]/20 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#0c4c8f]/15 bg-[#0c4c8f]/[0.03]">
              <p className="text-[11px] font-semibold text-[#0c4c8f] uppercase tracking-widest">
                Recent Attacks ({attackEvents.length})
              </p>
            </div>
            <div className="divide-y divide-[#0c4c8f]/10 max-h-[600px] overflow-y-auto">
              {attackEvents.map(ev => {
                const isActive = selected?.id === ev.id;
                const topShap  = ev.reasoning?.[0]?.shap_value ?? 0;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isActive ? "bg-[#0c4c8f]/10" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                        ATTACK_COLORS[ev.label] ?? "bg-[#0c4c8f]/10 text-[#0c4c8f] border-[#0c4c8f]/20"
                      }`}>
                        {ev.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{ev.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {topShap >= 0
                        ? <TrendingUp size={11} className="text-red-500" />
                        : <TrendingDown size={11} className="text-[#0c4c8f]" />}
                      <span className="text-[11px] text-slate-600 truncate font-mono">
                        {ev.reasoning?.[0]?.feature ?? "—"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 space-y-4">
            {selected && (
              <>
                {/* Summary row */}
                <div className="bg-white border border-[#0c4c8f]/20 rounded-xl px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2.5 py-1 rounded border text-xs font-bold ${
                      ATTACK_COLORS[selected.label] ?? "bg-[#0c4c8f]/10 text-[#0c4c8f] border-[#0c4c8f]/20"
                    }`}>
                      {selected.label}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{selected.date} {selected.timestamp}</span>
                    <span className="text-[11px] text-slate-400 ml-auto">
                      {selected.reasoning?.length ?? 0} feature contributions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    SHAP values below show which features pushed the model toward predicting{" "}
                    <span className="font-semibold text-slate-700">{selected.label}</span>.
                    Positive values increase, negative values decrease the predicted class score.
                  </p>
                </div>

                {/* SHAP bar table */}
                <div className="bg-white border border-[#0c4c8f]/20 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#0c4c8f]/15 bg-[#0c4c8f]/[0.03]">
                    <p className="text-[11px] font-semibold text-[#0c4c8f] uppercase tracking-widest">
                      Feature Contributions — Ranked by |SHAP|
                    </p>
                  </div>
                  <div className="divide-y divide-[#0c4c8f]/10">
                    {(selected.reasoning ?? []).map((r, i) => (
                      <div key={r.feature} className="px-5 py-3 grid grid-cols-12 items-center gap-2">
                        <div className="col-span-1 text-[11px] text-slate-400 font-mono">#{i + 1}</div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-1.5">
                            {r.direction === "increases_risk"
                              ? <TrendingUp size={12} className="text-red-500 shrink-0" />
                              : <TrendingDown size={12} className="text-[#0c4c8f] shrink-0" />}
                            <span className="text-xs font-semibold text-slate-700 truncate">{r.feature}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{r.severity_hint}</p>
                        </div>
                        <div className="col-span-2 text-[11px] font-mono text-slate-500">
                          val={r.actual_value}
                        </div>
                        <div className="col-span-4">
                          <SHAPBar value={r.shap_value} max={maxShap} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <div className="group relative">
                            <Info size={13} className="text-slate-300 hover:text-[#0c4c8f] cursor-pointer" />
                            <div className="absolute right-0 top-5 w-64 bg-white border border-[#0c4c8f]/20 rounded-lg p-3 text-[11px] text-slate-600 shadow-xl z-10 hidden group-hover:block leading-relaxed">
                              {r.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* XAI cards */}
                <div className="bg-white border border-[#0c4c8f]/20 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#0c4c8f]/15 bg-[#0c4c8f]/[0.03]">
                    <p className="text-[11px] font-semibold text-[#0c4c8f] uppercase tracking-widest">
                      XAI Cards — Detailed View
                    </p>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
                    {(selected.reasoning ?? []).map(r => (
                      <XaiCard key={r.feature} reason={r} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
