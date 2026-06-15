"use client";

import { AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { XaiCard } from "./XaiCard";
import type { StreamEvent } from "../app/types";

interface LiveFeedProps {
  event: StreamEvent | null;
}

export function LiveFeed({ event }: LiveFeedProps) {
  if (!event) {
    return (
      <div className="flex items-center justify-center h-32 rounded-xl border border-[#0c4c8f]/20 bg-white shadow-sm">
        <p className="text-[#0c4c8f]/70 animate-pulse text-xs tracking-widest uppercase">
          Waiting for connection...
        </p>
      </div>
    );
  }

  const isAttack = event.prediction_binary === 1;
  const topReason = event.reasoning?.[0];

  return (
    <div
      className={`rounded-xl border transition-colors duration-300 overflow-hidden shadow-sm ${
        isAttack
          ? "border-red-400/50 bg-red-50"
          : "border-[#0c4c8f]/25 bg-[#0c4c8f]/[0.04]"
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-3 flex items-center justify-between border-b ${
          isAttack
            ? "bg-red-100/70 border-red-200"
            : "bg-[#0c4c8f]/10 border-[#0c4c8f]/20"
        }`}
      >
        <div className="flex items-center gap-3">
          {isAttack ? (
            <AlertTriangle size={16} className="text-red-600" />
          ) : (
            <ShieldCheck size={16} className="text-[#0c4c8f]" />
          )}

          <span
            className={`font-semibold text-sm ${
              isAttack ? "text-red-700" : "text-[#0c4c8f]"
            }`}
          >
            {isAttack ? `ATTACK DETECTED — ${event.label}` : "BENIGN TRAFFIC"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
          <Clock size={11} />
          {event.date} {event.timestamp}
        </div>
      </div>

      {/* Prediction Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 py-4 border-b border-[#0c4c8f]/15 bg-white/70">
        <div className="rounded-lg border border-[#0c4c8f]/15 bg-white px-3 py-2 shadow-sm">
          <p className="text-[10px] text-[#0c4c8f]/60 uppercase tracking-widest">
            Prediction
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${
              isAttack ? "text-red-700" : "text-[#0c4c8f]"
            }`}
          >
            {isAttack ? "Attack" : "Benign"}
          </p>
        </div>

        <div className="rounded-lg border border-[#0c4c8f]/15 bg-white px-3 py-2 shadow-sm">
          <p className="text-[10px] text-[#0c4c8f]/60 uppercase tracking-widest">
            Class
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700 truncate">
            {event.label}
          </p>
        </div>

        <div className="rounded-lg border border-[#0c4c8f]/15 bg-white px-3 py-2 shadow-sm">
          <p className="text-[10px] text-[#0c4c8f]/60 uppercase tracking-widest">
            Top Feature
          </p>
          <p className="mt-1 text-xs font-mono text-slate-700 truncate">
            {topReason?.feature ?? "—"}
          </p>
        </div>

        <div className="rounded-lg border border-[#0c4c8f]/15 bg-white px-3 py-2 shadow-sm">
          <p className="text-[10px] text-[#0c4c8f]/60 uppercase tracking-widest">
            SHAP Value
          </p>
          <p
            className={`mt-1 text-xs font-mono font-semibold ${
              (topReason?.shap_value ?? 0) >= 0
                ? "text-red-700"
                : "text-[#0c4c8f]"
            }`}
          >
            {topReason
              ? `${topReason.shap_value > 0 ? "+" : ""}${topReason.shap_value.toFixed(4)}`
              : "—"}
          </p>
        </div>
      </div>

      {/* XAI Section */}
      {isAttack && event.reasoning.length > 0 && (
        <div className="p-5 bg-[#0c4c8f]/[0.025]">
          <p className="text-xs font-semibold text-[#0c4c8f] uppercase tracking-widest mb-3">
            XAI Decision — SHAP Feature Contributions (This Sample)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
            {event.reasoning.map((r) => (
              <XaiCard key={r.feature} reason={r} />
            ))}
          </div>
        </div>
      )}

      {/* Benign Message */}
      {!isAttack && (
        <div className="px-5 py-3 bg-white">
          <p className="text-xs text-slate-600">
            No threats detected in this flow.
          </p>
        </div>
      )}
    </div>
  );
}