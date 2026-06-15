// frontend/app/page.tsx — REPLACE
"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, Wifi, AlertTriangle, CheckCircle2, RefreshCw, Clock, Radio, TrendingUp } from "lucide-react";
import { StatCard }       from "../components/StatCard";
import { LiveFeed }       from "../components/LiveFeed";
import { TrafficChart }   from "../components/TrafficChart";
import { AttackPieChart } from "../components/AttackPieChart";
import { AlertsTable }    from "../components/AlertsTable";
import { fetchStream, fetchHistory, fetchStats, fetchDashboardSummary, fetchDashboardTraffic } from "./api";
import type { StreamEvent, TrafficPoint, SessionStats, HistoryResponse, StatsResponse } from "./types";

const MAX_TRAFFIC_POINTS  = 60;
const STREAM_INTERVAL_MS  = 5_000;
const HISTORY_INTERVAL_MS = 20_000;

export default function Dashboard() {
  const [latest,       setLatest]       = useState<StreamEvent | null>(null);
  const [traffic,      setTraffic]      = useState<TrafficPoint[]>([]);
  const [session,      setSession]      = useState<SessionStats>({ total: 0, attacks: 0, benign: 0, attackRate: 0 });
  const [history,      setHistory]      = useState<StreamEvent[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [filterType,   setFilterType]   = useState("all");
  const [connected,    setConnected]    = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState("");
  const [currentTime,  setCurrentTime]  = useState("");

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const refreshDashboardState = useCallback(async () => {
    try {
      const [summary, trafficData] = await Promise.all([fetchDashboardSummary(), fetchDashboardTraffic(MAX_TRAFFIC_POINTS)]);
      setSession(summary);
      setTraffic(trafficData.items);
    } catch { setConnected(false); }
  }, []);

  const poll = useCallback(async () => {
    try {
      const event = await fetchStream();
      setConnected(true);
      setLatest(event);
      setLastUpdate(event.timestamp);
      await refreshDashboardState();
    } catch { setConnected(false); }
  }, [refreshDashboardState]);

  const refreshHistory = useCallback(async (type = filterType) => {
    try {
      const [hist, stats]: [HistoryResponse, StatsResponse] = await Promise.all([
        fetchHistory(50, type === "all" ? undefined : type),
        fetchStats(),
      ]);
      setHistory(hist.items);
      setDistribution(stats.distribution);
    } catch { setConnected(false); }
  }, [filterType]);

  useEffect(() => {
    refreshDashboardState(); poll();
    const id = setInterval(poll, STREAM_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll, refreshDashboardState]);

  useEffect(() => {
    refreshHistory(filterType);
    const id = setInterval(() => refreshHistory(filterType), HISTORY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [filterType, refreshHistory]);

  const attackTypes = Object.keys(distribution).filter(t => t.toUpperCase() !== "BENIGN");

  return (
    <main className="max-w-screen-2xl mx-auto px-6 py-5 space-y-4">

      {/* Status bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Real-time-like Monitoring</span>
            {" · "}Streams preprocessed CIC-IDS2017 records with per-sample SHAP explanations
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <span className={`font-bold ${connected ? "text-emerald-600" : "text-red-500"}`}>
            <Radio size={10} className="inline mr-1" />
            {connected ? "LIVE" : "OFFLINE"}
          </span>
          <span><Clock size={10} className="inline mr-1" />{currentTime}</span>
          {lastUpdate && <span><RefreshCw size={10} className="inline mr-1" />Last: {lastUpdate}</span>}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Analyzed"   value={session.total.toLocaleString()}   icon={Activity}      accent="blue"   sublabel="flows this session" />
        <StatCard label="Attacks Detected" value={session.attacks.toLocaleString()} icon={AlertTriangle} accent="red"    sublabel="flagged by model" />
        <StatCard label="Benign Traffic"   value={session.benign.toLocaleString()}  icon={CheckCircle2}  accent="green"  sublabel="clean flows" />
        <StatCard
          label="Attack Rate" value={`${session.attackRate}%`} icon={Wifi}
          accent={session.attackRate > 30 ? "red" : session.attackRate > 10 ? "yellow" : "green"}
          sublabel="of total traffic"
        />
      </div>

      {/* Live feed */}
      <LiveFeed event={latest} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><TrafficChart data={traffic} /></div>
        <div className="lg:col-span-1"><AttackPieChart distribution={distribution} /></div>
      </div>

      {/* Quick tip linking to other pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <a href="/explainability" className="group bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:border-[#0c4c8f]/40 hover:bg-blue-50/30 transition-all flex items-center gap-4">
          <div className="p-2.5 bg-[#0c4c8f]/10 rounded-xl group-hover:bg-[#0c4c8f]/20 transition-colors">
            <TrendingUp size={18} className="text-[#0c4c8f]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">XAI Explorer</p>
            <p className="text-[11px] text-slate-400">Explore per-sample SHAP explanations for detected attacks</p>
          </div>
          <span className="ml-auto text-[#0c4c8f] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
        </a>
        <a href="/federated" className="group bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:border-[#0c4c8f]/40 hover:bg-blue-50/30 transition-all flex items-center gap-4">
          <div className="p-2.5 bg-[#0c4c8f]/10 rounded-xl group-hover:bg-[#0c4c8f]/20 transition-colors">
            <Wifi size={18} className="text-[#0c4c8f]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Federated Learning</p>
            <p className="text-[11px] text-slate-400">FedAvg simulation results — 5 clients, 5 rounds, Macro F1 74.51%</p>
          </div>
          <span className="ml-auto text-[#0c4c8f] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
        </a>
      </div>

      {/* Alerts */}
      <AlertsTable
        items={history}
        attackTypes={attackTypes}
        filterType={filterType}
        onFilterChange={type => { setFilterType(type); refreshHistory(type); }}
      />
    </main>
  );
}
