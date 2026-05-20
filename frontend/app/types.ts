export interface FeatureReason {
  feature: string;
  shap_value: number;
  actual_value: number;
  direction: "increases_risk" | "decreases_risk";
  description: string;
  severity_hint: string;
}

export interface StreamEvent {
  id: number;
  timestamp: string;
  date: string;
  prediction_binary: 0 | 1;
  prediction_multiclass: number;
  label: string;
  reasoning: FeatureReason[];
}

export interface HistoryResponse {
  total: number;
  items: StreamEvent[];
}

export interface StatsResponse {
  total_attacks: number;
  distribution: Record<string, number>;
}

export interface TrafficPoint {
  time: string;
  total: number;
  attacks: number;
}

export interface SessionStats {
  total: number;
  attacks: number;
  benign: number;
  attackRate: number;
}