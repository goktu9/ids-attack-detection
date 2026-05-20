"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Activity, Shield, Wifi, AlertTriangle,
  CheckCircle2, Radio, RefreshCw, Clock,
} from "lucide-react";

import { StatCard }       from "../components/StatCard";
import { LiveFeed }       from "../components/LiveFeed";
import { TrafficChart }   from "../components/TrafficChart";
import { AttackPieChart } from "../components/AttackPieChart";
import { AlertsTable }    from "../components/AlertsTable";

import {
  fetchStream,
  fetchHistory,
  fetchStats,
  fetchDashboardSummary,
  fetchDashboardTraffic,
} from "./api";
import type {
  StreamEvent, TrafficPoint, SessionStats,
  HistoryResponse, StatsResponse,
} from "./types";

const MAX_TRAFFIC_POINTS = 60;
const STREAM_INTERVAL_MS = 5_000;
const HISTORY_INTERVAL_MS = 20_000;

export default function Dashboard() {
  const [latest, setLatest]         = useState<StreamEvent | null>(null);
  const [traffic, setTraffic]       = useState<TrafficPoint[]>([]);
  const [session, setSession]       = useState<SessionStats>({ total: 0, attacks: 0, benign: 0, attackRate: 0 });
  const [history, setHistory]       = useState<StreamEvent[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [filterType, setFilterType] = useState("all");
  const [connected, setConnected]   = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
  const updateClock = () => {
    const now = new Date();
    setCurrentTime(
      now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };
  updateClock();

  const clockInterval = setInterval(updateClock, 1000);
  return () => clearInterval(clockInterval);
}, []);

  const refreshDashboardState = useCallback(async () => {
  try {
    const [summary, trafficData] = await Promise.all([
      fetchDashboardSummary(),
      fetchDashboardTraffic(MAX_TRAFFIC_POINTS),
    ]);

    setSession(summary);
    setTraffic(trafficData.items);
  } catch {
    setConnected(false);
  }
}, []);

const poll = useCallback(async () => {
    try {
      const event = await fetchStream();

      setConnected(true);
      setLatest(event);
      setLastUpdate(event.timestamp);

    await refreshDashboardState();
  } catch {
    setConnected(false);
  }
}, [refreshDashboardState]);

  const refreshHistory = useCallback(async (selectedType = filterType) => {
  try {
    const [hist, stats]: [HistoryResponse, StatsResponse] = await Promise.all([
      fetchHistory(50, selectedType === "all" ? undefined : selectedType),
      fetchStats(),
    ]);

    setHistory(hist.items);
    setDistribution(stats.distribution);
  } catch {
    setConnected(false);
  }
}, [filterType]);

  useEffect(() => {
  refreshDashboardState();
  poll();

  const streamInterval = setInterval(poll, STREAM_INTERVAL_MS);

  return () => clearInterval(streamInterval);
}, [poll, refreshDashboardState]);

useEffect(() => {
  refreshHistory(filterType);
  const historyInterval = setInterval(() => {
    refreshHistory(filterType);
  }, HISTORY_INTERVAL_MS);

  return () => clearInterval(historyInterval);
}, [filterType, refreshHistory]);

  const attackTypes = Object.keys(distribution).filter(
  type => type.toUpperCase() !== "BENIGN"
);

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Topbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600/15 rounded-lg border border-blue-600/25">
              <Shield size={17} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-wide">
                Intrusion Detection System
              </h1>
              <p className="text-[11px] text-slate-600">
                CIC-IDS2017 · Random Forest · SHAP XAI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full border ${
              connected
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-400"
                : "border-red-500/30 bg-red-950/30 text-red-400"
            }`}>
              <Radio size={10} className={connected ? "animate-pulse" : ""} />
              {connected ? "LIVE" : "DISCONNECTED"}
            </div>

            
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                <Clock size={10} />
                {currentTime}
              </div>

              {lastUpdate && (
                <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                  <RefreshCw size={10} />
                  Last event: {lastUpdate}
                </div>
              )}
              
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Analyzed"
            value={session.total.toLocaleString()}
            icon={Activity}
            accent="blue"
            sublabel="flows this session"
          />
          <StatCard
            label="Attacks Detected"
            value={session.attacks.toLocaleString()}
            icon={AlertTriangle}
            accent="red"
            sublabel="flagged by model"
          />
          <StatCard
            label="Benign Traffic"
            value={session.benign.toLocaleString()}
            icon={CheckCircle2}
            accent="green"
            sublabel="clean flows"
          />
          <StatCard
            label="Attack Rate"
            value={`${session.attackRate}%`}
            icon={Wifi}
            accent={session.attackRate > 30 ? "red" : session.attackRate > 10 ? "yellow" : "green"}
            sublabel="of total traffic"
          />
        </div>

        {/* Live feed */}
        <LiveFeed event={latest} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TrafficChart data={traffic} />
          </div>
          <div className="lg:col-span-1">
            <AttackPieChart distribution={distribution} />
          </div>
        </div>

        {/* History table */}
        <AlertsTable
  items={history}
  attackTypes={attackTypes}
  filterType={filterType}
  onFilterChange={type => {
    setFilterType(type);
    refreshHistory(type);
  }}
/>
      </main>
    </div>
  );
}