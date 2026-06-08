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
  "DoS Hulk": "text-red-700 bg-red-50 border-red-200",
  "DDoS": "text-red-700 bg-red-50 border-red-200",
  "DoS GoldenEye": "text-orange-700 bg-orange-50 border-orange-200",
  "DoS slowloris": "text-orange-700 bg-orange-50 border-orange-200",
  "DoS Slowhttptest": "text-orange-700 bg-orange-50 border-orange-200",
  "PortScan": "text-amber-700 bg-amber-50 border-amber-200",
  "FTP-Patator": "text-amber-700 bg-amber-50 border-amber-200",
  "SSH-Patator": "text-amber-700 bg-amber-50 border-amber-200",
  "Bot": "text-purple-700 bg-purple-50 border-purple-200",
  "Web Attack - Brute Force": "text-pink-700 bg-pink-50 border-pink-200",
  "Web Attack - XSS": "text-pink-700 bg-pink-50 border-pink-200",
};

export function AlertsTable({
  items,
  attackTypes,
  filterType,
  onFilterChange,
}: AlertsTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const badge = (label: string) =>
    BADGE[label] ?? "text-[#0c4c8f] bg-[#0c4c8f]/10 border-[#0c4c8f]/20";

  const getSeverity = (item: StreamEvent) => {
    if (item.prediction_binary === 0 || item.label === "BENIGN") {
      return {
        label: "Benign",
        className: "text-[#0c4c8f] bg-[#0c4c8f]/10 border-[#0c4c8f]/20",
      };
    }

    const shapValue = Math.abs(item.reasoning?.[0]?.shap_value ?? 0);

    if (shapValue >= 0.08) {
      return {
        label: "Critical",
        className: "text-red-700 bg-red-50 border-red-200",
      };
    }

    if (shapValue >= 0.04) {
      return {
        label: "High",
        className: "text-orange-700 bg-orange-50 border-orange-200",
      };
    }

    if (shapValue >= 0.02) {
      return {
        label: "Medium",
        className: "text-amber-700 bg-amber-50 border-amber-200",
      };
    }

    return {
      label: "Low",
      className: "text-slate-700 bg-slate-50 border-slate-200",
    };
  };

  const filteredItems = items.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    const severity = getSeverity(item).label.toLowerCase();

    const matchesSearch =
      !q ||
      item.label.toLowerCase().includes(q) ||
      item.timestamp.toLowerCase().includes(q) ||
      (item.reasoning ?? []).some((r) =>
        r.feature.toLowerCase().includes(q)
      );

    const matchesSeverity =
      severityFilter === "all" ||
      severity === severityFilter.toLowerCase();

    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="bg-white border border-[#0c4c8f]/20 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 border-b border-[#0c4c8f]/15 bg-[#0c4c8f]/[0.03] md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[#0c4c8f] uppercase tracking-widest">
            Security Event Timeline
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Review recent model detections and SHAP-based explanations.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0c4c8f]/50"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search events..."
              className="w-full sm:w-56 bg-white border border-[#0c4c8f]/20 text-slate-700 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#38b6ff]/50 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={13} className="text-[#0c4c8f]/50" />

            <select
              value={filterType}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full sm:w-auto bg-white border border-[#0c4c8f]/20 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#38b6ff]/50"
            >
              <option value="all">All Types</option>
              {attackTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full sm:w-auto bg-white border border-[#0c4c8f]/20 text-slate-700 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#38b6ff]/50"
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
        <div className="flex flex-col items-center justify-center h-32 gap-2 bg-white">
          <Shield size={22} className="text-[#0c4c8f]/30" />
          <p className="text-slate-500 text-xs font-medium">
            No matching security events found
          </p>
          <p className="text-slate-400 text-[11px]">
            Try changing the attack type filter or search query.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#0c4c8f]/10">
          {/* Column headers */}
          <div className="grid grid-cols-12 px-5 py-2 text-[10px] text-[#0c4c8f]/70 font-medium uppercase tracking-wider bg-[#0c4c8f]/[0.02]">
            <div className="col-span-1" />
            <div className="col-span-2">Time</div>
            <div className="col-span-3">Attack Type</div>
            <div className="col-span-2">Severity</div>
            <div className="col-span-3">Top SHAP Feature</div>
            <div className="col-span-1">SHAP</div>
          </div>

          {filteredItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() =>
                  setExpandedId(expandedId === item.id ? null : item.id)
                }
                className="w-full grid grid-cols-12 items-center px-5 py-3 hover:bg-[#38b6ff]/[0.06] transition-colors text-left"
              >
                <div className="col-span-1">
                  {expandedId === item.id ? (
                    <ChevronDown size={13} className="text-[#0c4c8f]/60" />
                  ) : (
                    <ChevronRight size={13} className="text-[#0c4c8f]/40" />
                  )}
                </div>

                <div className="col-span-2 font-mono text-[11px] text-slate-500">
                  {item.timestamp}
                </div>

                <div className="col-span-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${badge(
                      item.label
                    )}`}
                  >
                    {item.label}
                  </span>
                </div>

                <div className="col-span-2">
                  {(() => {
                    const severity = getSeverity(item);

                    return (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${severity.className}`}
                      >
                        {severity.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="col-span-3 text-[11px] text-slate-700 truncate font-mono">
                  {item.reasoning?.[0]?.feature ?? "—"}
                </div>

                <div className="col-span-1 font-mono text-[11px] text-orange-600">
                  {item.reasoning?.[0]
                    ? `${item.reasoning[0].shap_value > 0 ? "+" : ""}${item.reasoning[0].shap_value.toFixed(3)}`
                    : "—"}
                </div>
              </button>

              {expandedId === item.id && (
                <div className="px-5 pb-4 bg-[#0c4c8f]/[0.03] border-t border-[#0c4c8f]/15">
                  <p className="text-[10px] text-[#0c4c8f] uppercase tracking-widest mt-3 mb-3 font-semibold">
                    SHAP Explanation — {item.label}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
                    {(item.reasoning ?? []).map((r) => (
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