"use client";

import { useState } from "react";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import type { FeatureReason } from "../app/types";

interface XaiCardProps {
  reason: FeatureReason;
}

export function XaiCard({ reason }: XaiCardProps) {
  const [open, setOpen] = useState(false);

  const isRisk = reason.direction === "increases_risk";
  const shapAbs = Math.abs(reason.shap_value);
  const barWidth = Math.min(100, Math.round(shapAbs * 2000));

  return (
    <div className="relative bg-white border border-[#0c4c8f]/15 rounded-lg p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isRisk ? (
            <TrendingUp size={13} className="text-red-600 flex-shrink-0" />
          ) : (
            <TrendingDown size={13} className="text-[#0c4c8f] flex-shrink-0" />
          )}

          <p className="text-xs font-semibold text-[#0c4c8f] truncate">
            {reason.feature}
          </p>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="text-slate-400 hover:text-[#0c4c8f] transition-colors flex-shrink-0"
          aria-label="Show SHAP explanation details"
        >
          <Info size={13} />
        </button>
      </div>

      {/* Direction badge */}
      <p className={`text-[10px] mb-1 font-medium ${isRisk ? "text-red-600" : "text-[#0c4c8f]"}`}>
        {isRisk
          ? "Increases predicted attack class score"
          : "Decreases predicted attack class score"}
      </p>

      {/* SHAP importance bar */}
      <div className="h-1 bg-[#0c4c8f]/10 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isRisk
              ? "bg-gradient-to-r from-orange-400 to-red-500"
              : "bg-gradient-to-r from-[#38b6ff] to-[#0c4c8f]"
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <div className="flex justify-between items-center">
        <span
          className={`text-xs font-mono font-bold ${
            isRisk ? "text-red-700" : "text-[#0c4c8f]"
          }`}
        >
          SHAP {isRisk ? "+" : ""}
          {reason.shap_value.toFixed(4)}
        </span>

        <span className="text-xs text-slate-500 font-mono">
          val={reason.actual_value}
        </span>
      </div>

      {/* Tooltip */}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-2 w-72 bg-white border border-[#0c4c8f]/20 rounded-lg p-4 shadow-2xl text-xs">
          <p className="font-mono text-[#0c4c8f] mb-1 text-[10px]">
            {reason.feature}
          </p>

          <p className="text-slate-700 leading-relaxed mb-3">
            {reason.description}
          </p>

          {reason.severity_hint && (
            <div
              className={`rounded px-3 py-2 border ${
                isRisk
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-[#0c4c8f]/10 border-[#0c4c8f]/20 text-[#0c4c8f]"
              }`}
            >
              {reason.severity_hint}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-[#0c4c8f]/10 text-[10px] text-slate-500">
            SHAP: {reason.shap_value.toFixed(5)} · Actual value:{" "}
            {reason.actual_value}
          </div>
        </div>
      )}
    </div>
  );
}