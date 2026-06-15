// frontend/components/AlertsTable.tsx — REPLACE
// Max 5 rows by default, "Show more" button, professional styling

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Filter, Search, Shield, ChevronUp, Eye } from "lucide-react";
import { XaiCard } from "./XaiCard";
import type { StreamEvent } from "../app/types";

interface AlertsTableProps {
  items: StreamEvent[];
  attackTypes: string[];
  filterType: string;
  onFilterChange: (type: string) => void;
}

const BADGE: Record<string, string> = {
  "DoS Hulk":               "text-red-700 bg-red-50 border-red-200",
  "DDoS":                   "text-red-700 bg-red-50 border-red-200",
  "DoS GoldenEye":          "text-orange-700 bg-orange-50 border-orange-200",
  "DoS slowloris":          "text-orange-700 bg-orange-50 border-orange-200",
  "DoS Slowhttptest":       "text-orange-700 bg-orange-50 border-orange-200",
  "PortScan":               "text-amber-700 bg-amber-50 border-amber-200",
  "FTP-Patator":            "text-amber-700 bg-amber-50 border-amber-200",
  "SSH-Patator":            "text-amber-700 bg-amber-50 border-amber-200",
  "Bot":                    "text-purple-700 bg-purple-50 border-purple-200",
  "Web Attack - Brute Force": "text-pink-700 bg-pink-50 border-pink-200",
  "Web Attack - XSS":       "text-pink-700 bg-pink-50 border-pink-200",
};

const DEFAULT_VISIBLE = 5;

export function AlertsTable({ items, attackTypes, filterType, onFilterChange }: AlertsTableProps) {
  const [expandedId,    setExpandedId]    = useState<number | null>(null);
  const [searchTerm,    setSearchTerm]    = useState("");
  const [severityFilter,setSeverityFilter]= useState("all");
  const [showAll,       setShowAll]       = useState(false);

  const badge = (label: string) =>
    BADGE[label] ?? "text-[#0c4c8f] bg-[#0c4c8f]/10 border-[#0c4c8f]/20";

  const getSeverity = (item: StreamEvent) => {
    if (item.prediction_binary === 0) return { label: "Benign", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    const v = Math.abs(item.reasoning?.[0]?.shap_value ?? 0);
    if (v >= 0.08) return { label: "Critical", cls: "text-red-700 bg-red-50 border-red-200" };
    if (v >= 0.04) return { label: "High",     cls: "text-orange-700 bg-orange-50 border-orange-200" };
    if (v >= 0.02) return { label: "Medium",   cls: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "Low", cls: "text-slate-600 bg-slate-50 border-slate-200" };
  };

  const filtered = items.filter(item => {
    const q = searchTerm.trim().toLowerCase();
    const sev = getSeverity(item).label.toLowerCase();
    const matchSearch = !q || item.label.toLowerCase().includes(q) ||
      item.timestamp.includes(q) ||
      (item.reasoning ?? []).some(r => r.feature.toLowerCase().includes(q));
    const matchSev = severityFilter === "all" || sev === severityFilter;
    return matchSearch && matchSev;
  });

  const visible   = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const remaining = filtered.length - DEFAULT_VISIBLE;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#0c4c8f]/5 to-transparent flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#0c4c8f] uppercase tracking-widest">
            Security Event Timeline
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {filtered.length} events · click a row to expand SHAP explanation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search events…"
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg pl-8 pr-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-[#0c4c8f]/30 placeholder:text-slate-400"
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-slate-400" />
            <select
              value={filterType}
              onChange={e => onFilterChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0c4c8f]/30"
            >
              <option value="all">All Types</option>
              {attackTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0c4c8f]/30"
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Benign">Benign</option>
          </select>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-28 gap-2 bg-white">
          <Shield size={20} className="text-slate-300" />
          <p className="text-slate-400 text-xs">No matching events found.</p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-12 px-6 py-2 text-[10px] text-slate-400 font-semibold uppercase tracking-widest bg-slate-50 border-b border-slate-100">
            <div className="col-span-1" />
            <div className="col-span-2">Time</div>
            <div className="col-span-3">Attack Type</div>
            <div className="col-span-2">Severity</div>
            <div className="col-span-3">Top Feature</div>
            <div className="col-span-1">SHAP</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {visible.map(item => {
              const sev = getSeverity(item);
              const isOpen = expandedId === item.id;
              const topR = item.reasoning?.[0];
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    className="w-full grid grid-cols-12 items-center px-6 py-3 hover:bg-blue-50/50 transition-colors text-left group"
                  >
                    <div className="col-span-1">
                      {isOpen
                        ? <ChevronDown size={13} className="text-[#0c4c8f]" />
                        : <ChevronRight size={13} className="text-slate-300 group-hover:text-[#0c4c8f] transition-colors" />}
                    </div>
                    <div className="col-span-2 font-mono text-[11px] text-slate-400">{item.timestamp}</div>
                    <div className="col-span-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${badge(item.label)}`}>
                        {item.label}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${sev.cls}`}>
                        {sev.label}
                      </span>
                    </div>
                    <div className="col-span-3 text-[11px] text-slate-600 truncate font-mono">
                      {topR?.feature ?? "—"}
                    </div>
                    <div className={`col-span-1 font-mono text-[11px] font-bold ${(topR?.shap_value ?? 0) >= 0 ? "text-red-500" : "text-[#0c4c8f]"}`}>
                      {topR ? `${topR.shap_value > 0 ? "+" : ""}${topR.shap_value.toFixed(3)}` : "—"}
                    </div>
                  </button>

                  {/* Expanded SHAP */}
                  {isOpen && (
                    <div className="px-6 pb-5 pt-3 bg-gradient-to-b from-blue-50/60 to-white border-t border-slate-100">
                      <p className="text-[10px] text-[#0c4c8f] uppercase tracking-widest font-bold mb-3">
                        SHAP Explanation — {item.label}
                      </p>
                      {item.reasoning?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
                          {item.reasoning.map(r => <XaiCard key={r.feature} reason={r} />)}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No SHAP data for this event.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show more / less */}
          {filtered.length > DEFAULT_VISIBLE && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Showing <span className="font-semibold text-slate-600">{visible.length}</span> of{" "}
                <span className="font-semibold text-slate-600">{filtered.length}</span> events
              </p>
              <button
                onClick={() => setShowAll(s => !s)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0c4c8f] hover:underline"
              >
                {showAll ? (
                  <><ChevronUp size={13} /> Show less</>
                ) : (
                  <><Eye size={13} /> Show {remaining} more</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
