"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Filter, Search, Shield } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const badge = (label: string) =>
    BADGE[label] ?? "text-slate-300 bg-slate-800 border-slate-700";

  const getSeverity = (item: StreamEvent) => {
  if (item.prediction_binary === 0 || item.label === "BENIGN") {
    return {
      label: "Benign",
      className: "text-emerald-400 bg-emerald-950/50 border-emerald-700/40",
    };
  }

  const shapValue = Math.abs(item.reasoning?.[0]?.shap_value ?? 0);

  if (shapValue >= 0.08) {
    return {
      label: "Critical",
      className: "text-red-400 bg-red-950/50 border-red-700/40",
    };
  }

  if (shapValue >= 0.04) {
    return {
      label: "High",
      className: "text-orange-400 bg-orange-950/50 border-orange-700/40",
    };
  }

  if (shapValue >= 0.02) {
    return {
      label: "Medium",
      className: "text-yellow-400 bg-yellow-950/50 border-yellow-700/40",
    };
  }

  return {
    label: "Low",
    className: "text-slate-300 bg-slate-800 border-slate-700",
  };
};

  const filteredItems = items.filter(item => {
  const q = searchTerm.trim().toLowerCase();
  const severity = getSeverity(item).label.toLowerCase();

  const matchesSearch =
    !q ||
    item.label.toLowerCase().includes(q) ||
    item.timestamp.toLowerCase().includes(q) ||
    (item.reasoning ?? []).some(r =>
      r.feature.toLowerCase().includes(q)
    );

  const matchesSeverity =
    severityFilter === "all" ||
    severity === severityFilter.toLowerCase();

  return matchesSearch && matchesSeverity;
});

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 border-b border-slate-800 md:flex-row md:items-center md:justify-between">
  <div>
    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
      Security Event Timeline
    </h3>
    <p className="mt-1 text-[11px] text-slate-600">
      Review recent model detections and SHAP-based explanations.
    </p>
  </div>

  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div className="relative">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
      <input
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search events..."
        className="w-full sm:w-56 bg-slate-800 border border-slate-700/80 text-slate-300 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-slate-600"
      />
    </div>

    <div className="flex items-center gap-2">
      <Filter size={13} className="text-slate-600" />
      <select
        value={filterType}
        onChange={e => onFilterChange(e.target.value)}
        className="w-full sm:w-auto bg-slate-800 border border-slate-700/80 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      >
        <option value="all">All Types</option>
        {attackTypes.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <select
  value={severityFilter}
  onChange={e => setSeverityFilter(e.target.value)}
  className="w-full sm:w-auto bg-slate-800 border border-slate-700/80 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
>
  <option value="all">All Severities</option>
  <option value="critical">Critical</option>
  <option value="high">High</option>
  <option value="medium">Medium</option>
  <option value="low">Low</option>
  <option value="benign">Benign</option>
</select>

    </div>
  </div>
</div>

      {filteredItems.length === 0 ? (
  <div className="flex flex-col items-center justify-center h-32 gap-2">
    <Shield size={22} className="text-slate-700" />
    <p className="text-slate-500 text-xs font-medium">
      No matching security events found
    </p>
    <p className="text-slate-700 text-[11px]">
      Try changing the attack type filter or search query.
    </p>
  </div>
) : (
        <div className="divide-y divide-slate-800/50">
          {/* Column headers */}
          <div className="grid grid-cols-12 px-5 py-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">
  <div className="col-span-1" />
  <div className="col-span-2">Time</div>
  <div className="col-span-3">Attack Type</div>
  <div className="col-span-2">Severity</div>
  <div className="col-span-3">Top SHAP Feature</div>
  <div className="col-span-1">SHAP</div>
</div>

          {filteredItems.map(item => (
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

<div className="col-span-2">
  {(() => {
    const severity = getSeverity(item);

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${severity.className}`}>
        {severity.label}
      </span>
    );
  })()}
</div>

<div className="col-span-3 text-[11px] text-slate-400 truncate font-mono">
  {item.reasoning?.[0]?.feature ?? "—"}
</div>

<div className="col-span-1 font-mono text-[11px] text-orange-400">
  {item.reasoning?.[0]
    ? `${item.reasoning[0].shap_value > 0 ? "+" : ""}${item.reasoning[0].shap_value.toFixed(3)}`
    : "—"}
</div>
              </button>

              {expandedId === item.id && (
                <div className="px-5 pb-4 bg-slate-800/20 border-t border-slate-800/60">
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-3 mb-3 font-semibold">
                    SHAP Explanation — {item.label}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
                    {(item.reasoning ?? []).map(r => (
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