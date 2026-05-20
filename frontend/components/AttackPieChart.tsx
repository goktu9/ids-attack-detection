"use client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface AttackPieChartProps {
  distribution: Record<string, number>;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16",
  "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-1">{name}</p>
      <p className="text-slate-400">Sayı: <span className="text-white font-mono">{value}</span></p>
      <p className="text-slate-400">Oran: <span className="text-white font-mono">{p.pct}%</span></p>
    </div>
  );
};

export function AttackPieChart({ distribution }: AttackPieChartProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const data = Object.entries(distribution).map(([name, value]) => ({
    name,
    value,
    pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
  }));

  if (data.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex items-center justify-center h-[280px]">
        <p className="text-slate-600 text-sm">Henüz saldırı kaydı yok</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">
        Saldırı Türü Dağılımı
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span style={{ fontSize: 11, color: "#94a3b8" }}>{value}</span>}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
