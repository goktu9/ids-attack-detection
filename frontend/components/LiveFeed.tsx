// frontend/components/LiveFeed.tsx — REPLACE
"use client";

import { AlertTriangle, ShieldCheck, Clock, Zap } from "lucide-react";
import { XaiCard } from "./XaiCard";
import type { StreamEvent } from "../app/types";

interface LiveFeedProps { event: StreamEvent | null; }

export function LiveFeed({ event }: LiveFeedProps) {
  if (!event) {
    return (
      <div className="flex items-center justify-center h-28 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 text-slate-400 animate-pulse text-xs tracking-widest uppercase">
          <Zap size={13} />Waiting for connection…
        </div>
      </div>
    );
  }

  const isAttack = event.prediction_binary === 1;
  const topReason = event.reasoning?.[0];

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${
      isAttack ? "border-red-200 bg-white" : "border-emerald-200 bg-white"
    }`}>
      {/* Header bar */}
      <div className={`px-5 py-3 flex items-center justify-between ${
        isAttack
          ? "bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100"
          : "bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isAttack ? "bg-red-100" : "bg-emerald-100"}`}>
            {isAttack
              ? <AlertTriangle size={14} className="text-red-600" />
              : <ShieldCheck  size={14} className="text-emerald-600" />}
          </div>
          <span className={`font-bold text-sm ${isAttack ? "text-red-700" : "text-emerald-700"}`}>
            {isAttack ? `ATTACK DETECTED — ${event.label}` : "BENIGN TRAFFIC"}
          </span>
          {isAttack && (
            <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold border border-red-200 animate-pulse">
              ALERT
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
          <Clock size={10} />{event.date} {event.timestamp}
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 py-4 bg-slate-50/50 border-b border-slate-100">
        {[
          { label: "Prediction", value: isAttack ? "Attack" : "Benign", color: isAttack ? "text-red-600" : "text-emerald-600" },
          { label: "Class",      value: event.label,                    color: "text-slate-700" },
          { label: "Top Feature",value: topReason?.feature ?? "—",      color: "text-slate-700" },
          { label: "SHAP Value", value: topReason
              ? `${topReason.shap_value > 0 ? "+" : ""}${topReason.shap_value.toFixed(4)}`
              : "—",
            color: (topReason?.shap_value ?? 0) >= 0 ? "text-red-600" : "text-[#0c4c8f]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 shadow-sm">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">{label}</p>
            <p className={`text-xs font-bold truncate font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* SHAP cards */}
      {isAttack && event.reasoning.length > 0 && (
        <div className="p-5 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-bold text-[#0c4c8f] uppercase tracking-widest">
              SHAP Explanation — Predicted Attack Class
            </p>
            <span className="text-[10px] text-slate-400 font-normal normal-case tracking-normal">
              · top feature contributions · supports analyst interpretation
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
            {event.reasoning.map(r => <XaiCard key={r.feature} reason={r} />)}
          </div>
        </div>
      )}

      {!isAttack && (
        <div className="px-5 py-3 bg-white">
          <p className="text-xs text-slate-400">No threats detected in this flow.</p>
        </div>
      )}
    </div>
  );
}
