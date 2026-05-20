"use client";
import { useState } from "react";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import type { FeatureReason } from "../app/types";

interface XaiCardProps {
  reason: FeatureReason;
}

export function XaiCard({ reason }: XaiCardProps) {
  const [open, setOpen] = useState(false);
  const isRisk   = reason.direction === "increases_risk";
  const shapAbs  = Math.abs(reason.shap_value);
  const barWidth = Math.min(100, Math.round(shapAbs * 2000));

  return (
    <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isRisk
            ? <TrendingUp size={13} className="text-red-400 flex-shrink-0" />
            : <TrendingDown size={13} className="text-emerald-400 flex-shrink-0" />}
          <p className="text-xs font-semibold text-slate-200 truncate">{reason.feature}</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          <Info size={13} />
        </button>
      </div>

      {/* SHAP importance bar */}
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isRisk
              ? "bg-gradient-to-r from-orange-500 to-red-500"
              : "bg-gradient-to-r from-blue-500 to-emerald-500"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className="flex justify-between items-center">
        <span className={`text-xs font-mono font-bold ${isRisk ? "text-red-400" : "text-emerald-400"}`}>
          SHAP {isRisk ? "+" : ""}{reason.shap_value.toFixed(4)}
        </span>
        <span className="text-xs text-slate-500 font-mono">
          val={reason.actual_value}
        </span>
      </div>

      {/* Tooltip */}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-2 w-72 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-2xl shadow-black/60 text-xs">
          <p className="font-mono text-slate-400 mb-1 text-[10px]">{reason.feature}</p>
          <p className="text-slate-200 leading-relaxed mb-3">{reason.description}</p>
          {reason.severity_hint && (
            <div className={`rounded px-3 py-2 border ${
              isRisk
                ? "bg-red-950/60 border-red-500/30 text-red-300"
                : "bg-blue-950/60 border-blue-500/30 text-blue-300"
            }`}>
              {reason.severity_hint}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-500">
            SHAP: {reason.shap_value.toFixed(5)} · Actual value: {reason.actual_value}
          </div>
        </div>
      )}
    </div>
  );
}