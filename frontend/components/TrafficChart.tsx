"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { TrafficPoint } from "../types";

interface TrafficChartProps {
  data: TrafficPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold font-mono">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
          Gerçek Zamanlı Trafik Akışı
        </h3>
        <span className="text-xs text-slate-600">Son 60 kayıt</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#475569", fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Toplam"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
          <Line
            type="monotone"
            dataKey="attacks"
            name="Saldırı"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#ef4444" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
