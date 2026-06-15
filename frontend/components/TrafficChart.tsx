// frontend/components/TrafficChart.tsx — REPLACE
"use client";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

interface TrafficPoint { time: string; total: number; attacks: number; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-500 mb-1 font-mono">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-semibold" style={{ color: p.color }}>
          {p.name}: <span className="font-mono">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function TrafficChart({ data }: { data: TrafficPoint[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Real-Time Traffic Flow</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Cumulative counts this session</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0c4c8f] inline-block" />Total</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Attacks</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#0c4c8f" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0c4c8f" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="attackGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total"   name="Total"  stroke="#0c4c8f" strokeWidth={2} fill="url(#totalGrad)"  dot={false} />
          <Area type="monotone" dataKey="attacks" name="Attack" stroke="#ef4444" strokeWidth={2} fill="url(#attackGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
