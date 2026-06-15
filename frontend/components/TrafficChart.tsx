"use client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
interface TrafficPoint {
  time: string;
  total: number;
  attacks: number;
}

interface TrafficChartProps {
  data: TrafficPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#0c4c8f]/20 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#0c4c8f] mb-1 font-semibold">{label}</p>
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
    <div className="bg-white border border-[#0c4c8f]/20 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#0c4c8f] uppercase tracking-widest">
          Real-Time Traffic Flow
        </h3>
        <span className="text-xs text-slate-600">Last 60 records</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#0c4c8f", fontSize: 10 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: "#0c4c8f", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#0c4c8f"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#3b82f6" }}
          />
          <Line
            type="monotone"
            dataKey="attacks"
            name="Attack"
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
