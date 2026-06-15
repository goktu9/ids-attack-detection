// frontend/components/StatCard.tsx — REPLACE
"use client";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "blue" | "red" | "green" | "yellow";
  sublabel?: string;
}

const ACCENT = {
  blue:   { border: "border-[#0c4c8f]/20", text: "text-[#0c4c8f]",   bg: "bg-[#0c4c8f]/8",   dot: "bg-[#0c4c8f]" },
  red:    { border: "border-red-200",      text: "text-red-600",     bg: "bg-red-50",         dot: "bg-red-500" },
  green:  { border: "border-emerald-200",  text: "text-emerald-600", bg: "bg-emerald-50",     dot: "bg-emerald-500" },
  yellow: { border: "border-amber-200",    text: "text-amber-600",   bg: "bg-amber-50",       dot: "bg-amber-500" },
};

export function StatCard({ label, value, icon: Icon, accent = "blue", sublabel }: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <div className={`relative bg-white rounded-2xl border ${a.border} p-5 shadow-sm overflow-hidden group hover:shadow-md transition-shadow`}>
      {/* Subtle top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${a.dot} opacity-60`} />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className={`text-3xl font-bold font-mono tabular-nums ${a.text}`}>{value}</p>
          {sublabel && <p className="text-[11px] text-slate-400">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${a.bg}`}>
          <Icon size={18} className={a.text} />
        </div>
      </div>
    </div>
  );
}
