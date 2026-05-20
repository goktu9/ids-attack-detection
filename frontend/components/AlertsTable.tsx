"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { XaiCard } from "./XaiCard";
import type { StreamEvent } from "../app/types";

interface AlertsTableProps {
  items: StreamEvent[];
  attackTypes: string[];
  filterType: string;
  onFilterChange: (type: string) => void;
}

const BADGE: Record<string, string> = {
  "DoS Hulk":                    "text-red-400 bg-red-950/50 border-red-700/40",
  "DDoS":                        "text-red-400 bg-red-950/50 border-red-700/40",
  "DoS GoldenEye":               "text-orange-400 bg-orange-950/50 border-orange-700/40",
  "DoS slowloris":               "text-orange-400 bg-orange-950/50 border-orange-700/40",
  "DoS Slowhttptest":            "text-orange-400 bg-orange-950/50 border-orange-700/40",
  "PortScan":                    "text-yellow-400 bg-yellow-950/50 border-yellow-700/40",
  "FTP-Patator":                 "text-amber-400 bg-amber-950/50 border-amber-700/40",
  "SSH-Patator":                 "text-amber-400 bg-amber-950/50 border-amber-700/40",
  "Bot":                         "text-purple-400 bg-purple-950/50 border-purple-700/40",
  "Web Attack - Brute Force":    "text-pink-400 bg-pink-950/50 border-pink-700/40",
  "Web Attack - XSS":            "text-pink-400 bg-pink-950/50 border-pink-700/40",
};

export function AlertsTable({ items, attackTypes, filterType, onFilterChange }: AlertsTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const badge = (label: string) =>
    BADGE[label] ?? "text-slate-300 bg-slate-800 border-slate-700";

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Attack History
        </h3>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-600" />
          <select
            value={filterType}
            onChange={e => onFilterChange(e.target.value)}
            className="bg-slate-800 border border-slate-700/80 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="all">All Types</option>
            {attackTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center h-28">
          <p className="text-slate-600 text-xs">No attack records yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {/* Column headers */}
          <div className="grid grid-cols-12 px-5 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">
            <div className="col-span-1" />
            <div className="col-span-2">Time</div>
            <div className="col-span-3">Attack Type</div>
            <div className="col-span-4">Top SHAP Feature</div>
            <div className="col-span-2">SHAP Value</div>
          </div>

          {items.map(item => (
            <div key={item.id}>
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-800/30 transition-colors text-left"
              >
                <div className="col-span-1">
                  {expandedId === item.id
                    ? <ChevronDown size={13} className="text-slate-500" />
                    : <ChevronRight size={13} className="text-slate-600" />}
                </div>
                <div className="col-span-2 font-mono text-[11px] text-slate-500">
                  {item.timestamp}
                </div>
                <div className="col-span-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${badge(item.label)}`}>
                    {item.label}
                  </span>
                </div>
                <div className="col-span-4 text-[11px] text-slate-400 truncate font-mono">
                  {item.reasoning[0]?.feature ?? "—"}
                </div>
                <div className="col-span-2 font-mono text-[11px] text-orange-400">
                  {item.reasoning[0]
                    ? `${item.reasoning[0].shap_value > 0 ? "+" : ""}${item.reasoning[0].shap_value.toFixed(4)}`
                    : "—"}
                </div>
              </button>

              {expandedId === item.id && (
                <div className="px-5 pb-4 bg-slate-800/20 border-t border-slate-800/60">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-3 mb-3 font-semibold">
                    SHAP Explanation — {item.label}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
                    {item.reasoning.map(r => (
                      <XaiCard key={r.feature} reason={r} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}