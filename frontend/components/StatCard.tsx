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
  blue:   { border: "border-blue-500/30",   text: "text-blue-400",    glow: "from-blue-500/5" },
  red:    { border: "border-red-500/30",    text: "text-red-400",     glow: "from-red-500/5"  },
  green:  { border: "border-emerald-500/30",text: "text-emerald-400", glow: "from-emerald-500/5" },
  yellow: { border: "border-amber-500/30",  text: "text-amber-400",   glow: "from-amber-500/5"   },
};

export function StatCard({ label, value, icon: Icon, accent = "blue", sublabel }: StatCardProps) {
  const a = ACCENT[accent];
  return (
    <div className={`relative bg-slate-900/70 rounded-xl border ${a.border} p-5 overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-2xl font-bold font-mono tabular-nums ${a.text}`}>{value}</p>
          {sublabel && <p className="text-[11px] text-slate-600 mt-1">{sublabel}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-slate-800/80 ${a.text}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}