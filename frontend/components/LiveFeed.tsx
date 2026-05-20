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
      <div className="flex items-center justify-center h-32 rounded-xl border border-slate-800 bg-slate-900/60">
        <p className="text-slate-600 animate-pulse text-xs tracking-widest uppercase">
          Waiting for connection...
        </p>
      </div>
    );
  }

  const isAttack = event.prediction_binary === 1;

  return (
    <div className={`rounded-xl border transition-colors duration-300 overflow-hidden ${
      isAttack
        ? "border-red-500/50 bg-red-950/30 shadow-[0_0_24px_rgba(239,68,68,0.08)]"
        : "border-emerald-500/30 bg-emerald-950/10"
    }`}>
      <div className={`px-5 py-3 flex items-center justify-between border-b ${
        isAttack
          ? "bg-red-500/8 border-red-500/20"
          : "bg-emerald-500/8 border-emerald-500/15"
      }`}>
        <div className="flex items-center gap-3">
          {isAttack
            ? <AlertTriangle size={16} className="text-red-400" />
            : <ShieldCheck size={16} className="text-emerald-400" />}
          <span className={`font-semibold text-sm ${isAttack ? "text-red-300" : "text-emerald-300"}`}>
            {isAttack ? `ATTACK DETECTED — ${event.label}` : "BENIGN TRAFFIC"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
          <Clock size={11} />
          {event.date} {event.timestamp}
        </div>
      </div>

      {isAttack && event.reasoning.length > 0 && (
        <div className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            XAI Decision — SHAP Feature Contributions (this sample)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
            {event.reasoning.map((r) => (
              <XaiCard key={r.feature} reason={r} />
            ))}
          </div>
        </div>
      )}

      {!isAttack && (
        <div className="px-5 py-3">
          <p className="text-xs text-slate-600">No threats detected in this flow.</p>
        </div>
      )}
    </div>
  );
}