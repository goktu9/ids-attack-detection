from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import os
import time
import numpy as np
import shap
from collections import deque
from datetime import datetime
import json

app = FastAPI(title="IDS SOC API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR    = os.path.join(BASE_DIR, "models")
FEDERATED_DIR = os.path.join(BASE_DIR, "federated")

# ---------------------------------------------------------------------------
# Federated Learning results — loaded once at startup
# ---------------------------------------------------------------------------
_FED_RESULTS_PATH = os.path.join(FEDERATED_DIR, "results", "fedavg_final_results.json")
_FED_ROUNDS_PATH  = os.path.join(FEDERATED_DIR, "results", "fedavg_round_history.csv")

def _load_federated_summary() -> dict:
    """Load pre-computed FedAvg results from disk. Never crashes."""
    _FALLBACK = {
        "enabled": False,
        "mode": "FedAvg Simulation (results unavailable)",
        "model_type": "3-layer MLP (hidden: 128, 64)",
        "clients": 5,
        "rounds": 5,
        "local_epochs": 2,
        "iid_split": True,
        "n_features": 45,
        "train_samples": 0,
        "holdout_samples": 0,
        "final_accuracy": None,
        "final_weighted_f1": None,
        "final_macro_f1": None,
        "round_history": [],
        "note": "Could not load federated result files. Results file may be missing.",
    }
    try:
        with open(_FED_RESULTS_PATH, "r") as f:
            data = json.load(f)
        rounds: list = []
        try:
            rounds_df = pd.read_csv(_FED_ROUNDS_PATH)
            rounds = rounds_df.to_dict(orient="records")
        except Exception as re:
            print(f"[FedAvg] Round history not loaded: {re}")
        cfg = data.get("config", {})
        return {
            "enabled": True,
            "mode": "FedAvg Simulation (Offline)",
            "model_type": "3-layer MLP (hidden: 128, 64)",
            "clients": cfg.get("n_clients", 5),
            "rounds": cfg.get("communication_rounds", 5),
            "local_epochs": cfg.get("local_epochs", 2),
            "iid_split": cfg.get("iid_split", True),
            "n_features": data.get("n_features", 45),
            "train_samples": data.get("train_samples", 0),
            "holdout_samples": data.get("holdout_samples", 0),
            "final_accuracy": round(float(data.get("final_accuracy", 0)), 4),
            "final_weighted_f1": round(float(data.get("final_f1_weighted", 0)), 4),
            "final_macro_f1": round(float(data.get("final_f1_macro", 0)), 4),
            "round_history": rounds,
            "note": (
                "Federated learning was implemented as an offline simulation. "
                "5 virtual clients trained local MLP models without sharing raw data partitions. "
                "The central server aggregated weights using sample-weighted FedAvg over 5 rounds. "
                "Dashboard reports final holdout evaluation metrics. "
                "This prototype does not perform live distributed training."
            ),
        }
    except Exception as e:
        print(f"[FedAvg] Could not load results: {e}")
        _FALLBACK["note"] = f"Could not load federated result files: {e}"
        return _FALLBACK

_FEDERATED_SUMMARY = _load_federated_summary()
print(f"[FedAvg] Loaded — acc={_FEDERATED_SUMMARY.get('final_accuracy')}  macro_f1={_FEDERATED_SUMMARY.get('final_macro_f1')}")

def load_model(name):
    bundle = joblib.load(os.path.join(MODELS_DIR, name))
    return bundle["model"], bundle["features"]

bin_model, bin_feats = load_model("rf_binary.pkl")
mc_model,  mc_feats  = load_model("rf_multiclass.pkl")

holdout_df = pd.read_csv(
    os.path.join(FEDERATED_DIR, "holdout_test_label_multiclass.csv")
)

LABEL_MAP_PATH = os.path.join(BASE_DIR, "data", "csv", "label_mapping.csv")
try:
    label_map_df = pd.read_csv(LABEL_MAP_PATH)
    INT_TO_LABEL = dict(zip(label_map_df["label_int"], label_map_df["label_string"]))
except FileNotFoundError:
    INT_TO_LABEL = {}

print("Initializing SHAP explainers...")
mc_explainer  = shap.TreeExplainer(mc_model)
bin_explainer = shap.TreeExplainer(bin_model)
print("SHAP explainers ready.")

_history: deque = deque(maxlen=500)
_events: deque = deque(maxlen=1000)

# ---------------------------------------------------------------------------
# All 45 model features with security descriptions
# ---------------------------------------------------------------------------
FEATURE_DICT: dict[str, dict] = {
    "ACK Flag Count": {
        "description": "Number of TCP ACK-flagged packets. Excessive ACK flood leads to TCP resource exhaustion.",
        "severity_hint": "High ACK → ACK Flood",
    },
    "Active Max": {
        "description": "Maximum duration of active periods in the flow. Very short active bursts indicate high-frequency scanning or flood attacks.",
        "severity_hint": "Very short max active → Scan or flood attack",
    },
    "Active Mean": {
        "description": "Average duration of active periods in the flow. Very short active periods indicate high-frequency scanning activity.",
        "severity_hint": "Very short active period → Scan attack",
    },
    "Active Min": {
        "description": "Minimum duration of active periods in the flow. Consistently minimal active periods suggest automated attack tooling.",
        "severity_hint": "Very small → Automated / bot attack",
    },
    "Active Std": {
        "description": "Variability of active periods in the flow. Low variance suggests uniform automated behavior; high variance may indicate evasion.",
        "severity_hint": "Low variance → Bot or scripted attack",
    },
    "Average Packet Size": {
        "description": "Average packet size across the entire flow. Values outside protocol specification indicate an abnormal traffic profile.",
        "severity_hint": "Outside protocol norm → Anomaly",
    },
    "Avg Bwd Segment Size": {
        "description": "Average TCP segment size in backward direction. Larger-than-normal response segments are indicators of amplification.",
        "severity_hint": "Large segment → Amplification suspicion",
    },
    "Avg Fwd Segment Size": {
        "description": "Average TCP segment size in forward direction. Extremely small segments may indicate TCP segmentation attacks.",
        "severity_hint": "Very small segment → Segmentation attack",
    },
    "Bwd IAT Max": {
        "description": "Maximum inter-arrival time between backward packets. Long pauses from the server may indicate resource exhaustion under attack.",
        "severity_hint": "High max → Server under load / exhaustion",
    },
    "Bwd IAT Mean": {
        "description": "Average time interval between packets from server. Delayed responses are a harbinger of resource exhaustion.",
        "severity_hint": "Delay increase → Resource exhaustion",
    },
    "Bwd IAT Min": {
        "description": "Minimum inter-arrival time between backward packets. Very small minimum indicates extremely fast automated responses.",
        "severity_hint": "Near zero → Automated response / attack tool",
    },
    "Bwd IAT Std": {
        "description": "Variability of backward packet inter-arrival times. Low variance in server responses indicates uniform flood traffic.",
        "severity_hint": "Low variance → Uniform flood / amplification",
    },
    "Bwd IAT Total": {
        "description": "Sum of all inter-packet intervals in the backward direction. Server response delay indicates source under attack.",
        "severity_hint": "High value → Server overloaded",
    },
    "Bwd Packet Length Max": {
        "description": "Largest packet size (bytes) in the backward direction. Large response packets may indicate data exfiltration.",
        "severity_hint": "Large response → Data exfiltration suspicion",
    },
    "Bwd Packet Length Mean": {
        "description": "Average size of packets returned from server. High values may indicate large data transfers or amplification attacks.",
        "severity_hint": "High avg → Amplification attack",
    },
    "Bwd Packet Length Min": {
        "description": "Smallest packet size (bytes) returned from server. Very small minimum responses may indicate error-flooding or connection probing.",
        "severity_hint": "Very small → Probe or error flood",
    },
    "Bwd Packet Length Std": {
        "description": "Standard deviation of backward packet lengths. Low variance indicates uniform server-side responses typical of flood attacks.",
        "severity_hint": "Low std → Uniform flood traffic",
    },
    "Bwd Packets/s": {
        "description": "Packets per second returned from server. In amplification attacks, backward traffic far exceeds forward traffic.",
        "severity_hint": "Much higher than forward → Amplification",
    },
    "Down/Up Ratio": {
        "description": "Ratio of download to upload traffic volume. Extremely high or low ratios indicate asymmetric attack traffic such as amplification or exfiltration.",
        "severity_hint": "Extreme ratio → Amplification or exfiltration",
    },
    "FIN Flag Count": {
        "description": "Number of TCP FIN-flagged packets. Heavy FIN flood attacks fill connection tables causing denial of service.",
        "severity_hint": "High FIN → FIN Flood / TCP exhaustion",
    },
    "Flow Bytes/s": {
        "description": "Total bytes transferred per second. Abnormally high bandwidth usage indicates DDoS or data theft.",
        "severity_hint": "Extremely high → DDoS / Data exfiltration",
    },
    "Flow Duration": {
        "description": "Total duration of the network flow (microseconds). Very short flows may indicate port scans; very long flows may indicate data exfiltration.",
        "severity_hint": "Abnormal duration → Scan or persistent connection attack",
    },
    "Flow IAT Mean": {
        "description": "Average inter-arrival time between consecutive packets (microseconds). Very low values indicate automated attack tools (bots).",
        "severity_hint": "Very low IAT → Automated attack tool",
    },
    "Flow IAT Min": {
        "description": "Minimum inter-arrival time between any consecutive packets in the flow. Near-zero values indicate high-speed automated attack tools.",
        "severity_hint": "Near zero → Automated attack tool / flood",
    },
    "Flow IAT Std": {
        "description": "Variability between packet inter-arrival times. Low variance indicates bot traffic; high variance may indicate evasion techniques.",
        "severity_hint": "Abnormal variance → Evasion / Bot behavior",
    },
    "Flow Packets/s": {
        "description": "Packets sent per second. This value rises abnormally in flood attacks.",
        "severity_hint": "Extremely high → Flood attack",
    },
    "Fwd Header Length": {
        "description": "Sum of TCP/IP headers in forward direction packets. Abnormal header sizes may indicate option-based exploit attempts.",
        "severity_hint": "Abnormal size → Header injection",
    },
    "Fwd IAT Mean": {
        "description": "Average of forward packet inter-arrival intervals. Deviation from normal human behavior points to automated attack tools.",
        "severity_hint": "Abnormal value → Automated attack",
    },
    "Fwd IAT Min": {
        "description": "Minimum inter-arrival time between forward packets. Very small values are characteristic of DoS/DDoS flood tools sending packets at maximum rate.",
        "severity_hint": "Near zero → DoS/DDoS flood",
    },
    "Fwd IAT Std": {
        "description": "Standard deviation of forward packet inter-arrival times. Low variance indicates highly regular automated traffic, often from attack scripts.",
        "severity_hint": "Very low std → Scripted attack traffic",
    },
    "Fwd IAT Total": {
        "description": "Sum of all inter-packet times in the forward direction. Reflects latency increases under heavy load.",
        "severity_hint": "Increase → Resource exhaustion attack",
    },
    "Fwd PSH Flags": {
        "description": "Number of TCP PSH-flagged packets in forward direction. Many PSH flags with small payloads may indicate data tunneling.",
        "severity_hint": "High PSH → Tunneling / Covert channel",
    },
    "Fwd Packet Length Max": {
        "description": "Largest packet size (bytes) in the forward direction. Increases are seen in payload-stuffing exploit attempts.",
        "severity_hint": "Near max MTU → Buffer overflow attempt",
    },
    "Fwd Packet Length Mean": {
        "description": "Average packet length in the forward direction. Significant deviation from normal HTTP/HTTPS traffic indicates anomaly.",
        "severity_hint": "Deviation → Abnormal protocol behavior",
    },
    "Fwd Packet Length Min": {
        "description": "Smallest packet size (bytes) in the forward direction. Tiny minimum packets combined with high packet counts indicate probing or fragmentation attacks.",
        "severity_hint": "Very small + high count → Fragmentation or probe",
    },
    "Fwd Packet Length Std": {
        "description": "Standard deviation of forward packet lengths. Very low values indicate uniform-size flood traffic; very high values suggest heterogeneous attack payloads.",
        "severity_hint": "Extreme std → Flood or multi-stage attack",
    },
    "Fwd Packets/s": {
        "description": "Packets sent per second in the forward direction. Extremely high rates are the primary indicator of DoS and DDoS flood attacks.",
        "severity_hint": "Very high → DoS/DDoS flood",
    },
    "Idle Max": {
        "description": "Maximum idle period duration in the flow. Long idle periods followed by sudden bursts are characteristic of slow-loris and connection-exhaustion attacks.",
        "severity_hint": "Long idle + burst → Slow-loris / connection exhaustion",
    },
    "Idle Mean": {
        "description": "Average duration of idle periods in the flow. Long idle periods followed by sudden traffic bursts indicate slow-loris type attacks.",
        "severity_hint": "Long idle + sudden burst → Slow-loris",
    },
    "Idle Min": {
        "description": "Minimum idle period duration in the flow. Very short minimum idle periods indicate near-continuous high-rate traffic typical of flood attacks.",
        "severity_hint": "Very short → High-rate flood",
    },
    "Idle Std": {
        "description": "Variability of idle periods in the flow. Low variance indicates consistent automated pacing; high variance may indicate evasion timing techniques.",
        "severity_hint": "Low std → Automated pacing / scripted attack",
    },
    "Init_Win_bytes_backward": {
        "description": "TCP window size first advertised by server. Abnormal values indicate abuse of connection capacity.",
        "severity_hint": "Abnormal window → Capacity abuse",
    },
    "Init_Win_bytes_forward": {
        "description": "TCP window size advertised at connection start (forward). Zero or abnormally small window indicates TCP starvation attack.",
        "severity_hint": "Small window → TCP Window starvation",
    },
    "Min Packet Length": {
        "description": "Minimum packet size across all packets in the flow. Very small packets in large numbers are indicative of packet-flood or fragmentation attacks.",
        "severity_hint": "Tiny packets + high count → Flood / fragmentation",
    },
    "PSH Flag Count": {
        "description": "Total count of PSH-flagged packets. Small frequent PSH packets can simulate C2 communication.",
        "severity_hint": "Frequent small PSH → C2 communication suspicion",
    },
    "Packet Length Mean": {
        "description": "Average length of all packets. Deviation from protocol norms indicates abnormal payload carrying behavior.",
        "severity_hint": "Deviation → Protocol anomaly",
    },
    "Packet Length Std": {
        "description": "Standard deviation of packet lengths. High deviation may indicate heterogeneous payload structure.",
        "severity_hint": "High deviation → Mixed attack traffic",
    },
    "Packet Length Variance": {
        "description": "Total variability in packet sizes. Low variance indicates uniform bot traffic; high variance may indicate multi-stage attacks.",
        "severity_hint": "Extreme values → Bot or multi-stage attack",
    },
    "RST Flag Count": {
        "description": "Number of TCP RST-flagged packets. High RST count indicates connection termination attacks or aggressive port scans.",
        "severity_hint": "High RST → Port scan / TCP reset attack",
    },
    "SYN Flag Count": {
        "description": "Number of TCP SYN-flagged packets. High SYN count indicates SYN Flood attack creating half-open connections.",
        "severity_hint": "High SYN → SYN Flood / DDoS",
    },
    "Subflow Bwd Bytes": {
        "description": "Total bytes transferred in the backward subflow direction. High backward subflow bytes relative to forward may indicate amplification attack responses.",
        "severity_hint": "High backward → Amplification attack",
    },
    "Subflow Fwd Bytes": {
        "description": "Total bytes transferred forward in the subflow. Data exfiltration can be hidden across many small subflows.",
        "severity_hint": "High → Exfiltration hiding technique",
    },
    "Subflow Fwd Packets": {
        "description": "Number of packets going forward in the subflow. Many parallel subflows may indicate DDoS botnet coordination.",
        "severity_hint": "High subflow → Botnet coordination",
    },
    "Total Backward Packets": {
        "description": "Total packets returned in the destination→source direction. Heavy server responses may indicate an actively attacked service.",
        "severity_hint": "High value → Server under load",
    },
    "Total Fwd Packets": {
        "description": "Total packets sent in the source→destination direction. Unusually high values are observed in DoS attacks.",
        "severity_hint": "High value → DoS/DDoS likelihood",
    },
    "Total Length of Fwd Packets": {
        "description": "Total bytes sent in the forward direction across all packets. Very high values combined with short duration indicate data exfiltration or DoS flooding.",
        "severity_hint": "High total + short duration → Exfiltration or DoS",
    },
    "URG Flag Count": {
        "description": "Number of TCP URG flagged packets. Rarely seen in normal traffic; used in exploit payload carrying techniques.",
        "severity_hint": "High URG → Abnormal / Exploit payload",
    },
    "act_data_pkt_fwd": {
        "description": "Number of packets carrying actual data in forward direction. High value combined with short flow duration indicates burst attack.",
        "severity_hint": "Short duration + high data → Burst attack",
    },
}


def get_shap_reasoning(
    explainer,
    X_sample: pd.DataFrame,
    feature_names: list,
    predicted_class: int = 0,
    model_classes=None,
    top_n: int = 5,
) -> list:
    """
    SHAP for multiclass RF.
    Confirmed output shape: (n_samples=1, n_features=45, n_classes=12)
    Classes are np.int64 — cast everything to int for comparison.
    """
    feature_names_list = list(feature_names)
    try:
        sv  = explainer.shap_values(X_sample)
        arr = np.array(sv)  # (1, 45, 12)

        # Resolve class column — cast to plain int to avoid np.int64 mismatch
        class_idx = 0
        if model_classes is not None:
            cls_list  = [int(c) for c in model_classes]
            pc        = int(predicted_class)
            class_idx = cls_list.index(pc) if pc in cls_list else 0
        else:
            class_idx = int(predicted_class)

        if arr.ndim == 3:
            # (n_samples, n_features, n_classes)
            n_cls    = arr.shape[2]
            safe_idx = max(0, min(class_idx, n_cls - 1))
            raw      = arr[0, :, safe_idx]   # → (n_features,)
        elif arr.ndim == 2:
            raw = arr[0]
        elif arr.ndim == 1:
            raw = arr
        else:
            print(f"[SHAP] Unexpected ndim={arr.ndim} shape={arr.shape}")
            return []

        if len(raw) != len(feature_names_list):
            print(f"[SHAP] Feature mismatch: {len(raw)} vs {len(feature_names_list)}")
            return []

        top_indices = np.argsort(np.abs(raw))[::-1][:top_n]
        result = []
        for idx in top_indices:
            i          = int(idx)
            feat_name  = feature_names_list[i]
            shap_val   = float(raw[i])
            actual_val = float(X_sample.iloc[0, i])
            info       = FEATURE_DICT.get(feat_name, {})
            result.append({
                "feature":       feat_name,
                "shap_value":    round(shap_val, 5),
                "actual_value":  round(actual_val, 4),
                "direction":     "increases_risk" if shap_val > 0 else "decreases_risk",
                "description":   info.get("description", "No description available."),
                "severity_hint": info.get("severity_hint", ""),
            })
        return result

    except Exception as e:
        print(f"[SHAP] Error: {e}")
        return []


@app.get("/predict/stream")
def stream_traffic():
    sample = holdout_df.sample(1)
    X_raw  = sample.drop(columns=[c for c in sample.columns if "label" in c.lower()])

    X_bin = X_raw.reindex(columns=bin_feats, fill_value=0)
    X_mc  = X_raw.reindex(columns=mc_feats,  fill_value=0)

    pred_bin  = int(bin_model.predict(X_bin)[0])
    pred_mc   = int(mc_model.predict(X_mc)[0])
    label_str = INT_TO_LABEL.get(pred_mc, f"Class {pred_mc}")

    reasoning = []
    if pred_bin == 1:
        try:
            reasoning = get_shap_reasoning(
                mc_explainer,
                X_mc,
                mc_feats,
                predicted_class=pred_mc,
                model_classes=getattr(mc_model, "classes_", None),
                top_n=5,
            )
        except Exception as e:
            print(f"[SHAP] stream error (non-fatal): {e}")
            reasoning = []

    event = {
        "id":                    int(time.time() * 1000),
        "timestamp":             datetime.now().strftime("%H:%M:%S"),
        "date":                  datetime.now().strftime("%Y-%m-%d"),
        "prediction_binary":     pred_bin,
        "prediction_multiclass": pred_mc,
        "label":                 label_str,
        "reasoning":             reasoning,
    }

    _events.appendleft(event)

    if pred_bin == 1:
        _history.appendleft(event)

    return event


@app.get("/history")
def get_history(
    limit: int = Query(default=50, le=500),
    attack_type: str = Query(default=None),
):
    data = list(_history)
    if attack_type and attack_type.lower() != "all":
        data = [e for e in data if e["label"].lower() == attack_type.lower()]
    return {"total": len(data), "items": data[:limit]}


@app.get("/history/stats")
def get_stats():
    data = list(_history)
    distribution: dict[str, int] = {}
    for e in data:
        lbl = e["label"]
        distribution[lbl] = distribution.get(lbl, 0) + 1
    return {"total_attacks": len(data), "distribution": distribution}


@app.get("/dashboard/summary")
def get_dashboard_summary():
    data = list(_events)
    total      = len(data)
    attacks    = sum(1 for e in data if e["prediction_binary"] == 1)
    benign     = total - attacks
    attack_rate = round((attacks / total) * 100) if total > 0 else 0
    return {
        "total":      total,
        "attacks":    attacks,
        "benign":     benign,
        "attackRate": attack_rate,
    }


@app.get("/dashboard/traffic")
def get_dashboard_traffic(limit: int = Query(default=60, le=500)):
    data   = list(reversed(list(_events)))[-limit:]
    points = []
    total  = 0
    attacks = 0
    for e in data:
        total   += 1
        attacks += int(e["prediction_binary"])
        points.append({
            "time":    e["timestamp"],
            "total":   total,
            "attacks": attacks,
        })
    return {"items": points}


@app.get("/")
def root():
    return {"status": "IDS SOC Engine Online", "version": "2.1", "xai": "SHAP TreeExplainer"}


@app.get("/federated/summary")
def get_federated_summary():
    """Returns FedAvg federated learning simulation results (offline metrics)."""
    return _FEDERATED_SUMMARY


@app.get("/debug/shap")
def debug_shap():
    sample = holdout_df[holdout_df["label_multiclass"] != 0].sample(1)
    X_raw  = sample.drop(columns=[c for c in sample.columns if "label" in c.lower()])
    X_mc   = X_raw.reindex(columns=mc_feats, fill_value=0)
    sv     = mc_explainer.shap_values(X_mc)
    if isinstance(sv, list):
        return {
            "type": "list",
            "n_classes": len(sv),
            "shapes": [str(np.array(s).shape) for s in sv],
            "n_features_expected": len(mc_feats),
        }
    else:
        return {
            "type": "array",
            "shape": str(np.array(sv).shape),
            "n_features_expected": len(mc_feats),
        }