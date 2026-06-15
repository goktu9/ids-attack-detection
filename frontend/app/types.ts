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

export interface FedRound {
  round: number;
  accuracy: number;
  precision_weighted: number;
  recall_weighted: number;
  f1_weighted: number;
  f1_macro: number;
}

export interface FederatedSummary {
  enabled: boolean;
  mode: string;
  model_type: string;
  clients: number;
  rounds: number;
  local_epochs: number;
  iid_split: boolean;
  n_features: number;
  train_samples: number;
  holdout_samples: number;
  final_accuracy: number | null;
  final_weighted_f1: number | null;
  final_macro_f1: number | null;
  round_history: FedRound[];
  note: string;
}
