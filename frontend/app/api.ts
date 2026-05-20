import axios from "axios";
import type {
  StreamEvent,
  HistoryResponse,
  StatsResponse,
  SessionStats,
  TrafficPoint,
} from "./types";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 10000,  // 10 saniye — SHAP hesabı bazen uzun sürüyor
});

export const fetchStream  = (): Promise<StreamEvent> =>
  api.get("/predict/stream").then(r => r.data);

export const fetchHistory = (limit = 50, attack_type?: string): Promise<HistoryResponse> =>
  api.get("/history", { params: { limit, ...(attack_type ? { attack_type } : {}) } }).then(r => r.data);

export const fetchStats   = (): Promise<StatsResponse> =>
  api.get("/history/stats").then(r => r.data);

export const fetchDashboardSummary = (): Promise<SessionStats> =>
  api.get("/dashboard/summary").then(r => r.data);

export const fetchDashboardTraffic = (
  limit = 60
): Promise<{ items: TrafficPoint[] }> =>
  api.get("/dashboard/traffic", { params: { limit } }).then(r => r.data);