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

FEATURE_DICT: dict[str, dict] = {
    "Flow Duration": {
        "description": "Total duration of the network flow (microseconds). Very short flows may indicate port scans; very long flows may indicate data exfiltration.",
        "severity_hint": "Abnormal duration → Scan or persistent connection attack",
    },
    "Total Fwd Packets": {
        "description": "Total packets sent in the source→destination direction. Unusually high values are observed in DoS attacks.",
        "severity_hint": "High value → DoS/DDoS likelihood",
    },
    "Total Backward Packets": {
        "description": "Total packets returned in the destination→source direction. Heavy server responses may indicate an actively attacked service.",
        "severity_hint": "High value → Server under load",
    },
    "Fwd Packet Length Max": {
        "description": "Largest packet size (bytes) in the forward direction. Increases are seen in payload-stuffing exploit attempts.",
        "severity_hint": "Near max MTU → Buffer overflow attempt",
    },
    "Fwd Packet Length Mean": {
        "description": "Average packet length in the forward direction. Significant deviation from normal HTTP/HTTPS traffic indicates anomaly.",
        "severity_hint": "Deviation → Abnormal protocol behavior",
    },
    "Bwd Packet Length Max": {
        "description": "Largest packet size (bytes) in the backward direction. Large response packets may indicate data exfiltration.",
        "severity_hint": "Large response → Data exfiltration suspicion",
    },
    "Bwd Packet Length Mean": {
        "description": "Average size of packets returned from server. High values may indicate large data transfers or amplification attacks.",
        "severity_hint": "High avg → Amplification attack",
    },
    "Flow Bytes/s": {
        "description": "Total bytes transferred per second. Abnormally high bandwidth usage indicates DDoS or data theft.",
        "severity_hint": "Extremely high → DDoS / Data exfiltration",
    },
    "Flow Packets/s": {
        "description": "Packets sent per second. This value rises abnormally in flood attacks.",
        "severity_hint": "Extremely high → Flood attack",
    },
    "Flow IAT Mean": {
        "description": "Average inter-arrival time between consecutive packets (microseconds). Very low values indicate automated attack tools (bots).",
        "severity_hint": "Very low IAT → Automated attack tool",
    },
    "Flow IAT Std": {
        "description": "Variability between packet inter-arrival times. Low variance indicates bot traffic; high variance may indicate evasion techniques.",
        "severity_hint": "Abnormal variance → Evasion / Bot behavior",
    },
    "Fwd IAT Total": {
        "description": "Sum of all inter-packet times in the forward direction. Reflects latency increases under heavy load.",
        "severity_hint": "Increase → Resource exhaustion attack",
    },
    "Fwd IAT Mean": {
        "description": "Average of forward packet inter-arrival intervals. Deviation from normal human behavior points to automated attack tools.",
        "severity_hint": "Abnormal value → Automated attack",
    },
    "Bwd IAT Total": {
        "description": "Sum of all inter-packet intervals in the backward direction. Server response delay indicates source under attack.",
        "severity_hint": "High value → Server overloaded",
    },
    "Bwd IAT Mean": {
        "description": "Average time interval between packets from server. Delayed responses are a harbinger of resource exhaustion.",
        "severity_hint": "Delay increase → Resource exhaustion",
    },
    "Fwd PSH Flags": {
        "description": "Number of TCP PSH-flagged packets in forward direction. Many PSH flags with small payloads may indicate data tunneling.",
        "severity_hint": "High PSH → Tunneling / Covert channel",
    },
    "Fwd Header Length": {
        "description": "Sum of TCP/IP headers in forward direction packets. Abnormal header sizes may indicate option-based exploit attempts.",
        "severity_hint": "Abnormal size → Header injection",
    },
    "Bwd Packets/s": {
        "description": "Packets per second returned from server. In amplification attacks, backward traffic far exceeds forward traffic.",
        "severity_hint": "Much higher than forward → Amplification",
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
    "FIN Flag Count": {
        "description": "Number of TCP FIN-flagged packets. Heavy FIN flood attacks fill connection tables causing denial of service.",
        "severity_hint": "High FIN → FIN Flood / TCP exhaustion",
    },
    "SYN Flag Count": {
        "description": "Number of TCP SYN-flagged packets. High SYN count indicates SYN Flood attack creating half-open connections.",
        "severity_hint": "High SYN → SYN Flood / DDoS",
    },
    "RST Flag Count": {
        "description": "Number of TCP RST-flagged packets. High RST count indicates connection termination attacks or aggressive port scans.",
        "severity_hint": "High RST → Port scan / TCP reset attack",
    },
    "PSH Flag Count": {
        "description": "Total count of PSH-flagged packets. Small frequent PSH packets can simulate C2 communication.",
        "severity_hint": "Frequent small PSH → C2 communication suspicion",
    },
    "ACK Flag Count": {
        "description": "Number of TCP ACK-flagged packets. Excessive ACK flood leads to TCP resource exhaustion.",
        "severity_hint": "High ACK → ACK Flood",
    },
    "URG Flag Count": {
        "description": "Number of TCP URG flagged packets. Rarely seen in normal traffic; used in exploit payload carrying techniques.",
        "severity_hint": "High URG → Abnormal / Exploit payload",
    },
    "Average Packet Size": {
        "description": "Average packet size across the entire flow. Values outside protocol specification indicate an abnormal traffic profile.",
        "severity_hint": "Outside protocol norm → Anomaly",
    },
    "Avg Fwd Segment Size": {
        "description": "Average TCP segment size in forward direction. Extremely small segments may indicate TCP segmentation attacks.",
        "severity_hint": "Very small segment → Segmentation attack",
    },
    "Avg Bwd Segment Size": {
        "description": "Average TCP segment size in backward direction. Larger-than-normal response segments are indicators of amplification.",
        "severity_hint": "Large segment → Amplification suspicion",
    },
    "Subflow Fwd Packets": {
        "description": "Number of packets going forward in the subflow. Many parallel subflows may indicate DDoS botnet coordination.",
        "severity_hint": "High subflow → Botnet coordination",
    },
    "Subflow Fwd Bytes": {
        "description": "Total bytes transferred forward in the subflow. Data exfiltration can be hidden across many small subflows.",
        "severity_hint": "High → Exfiltration hiding technique",
    },
    "Init_Win_bytes_forward": {
        "description": "TCP window size advertised at connection start (forward). Zero or abnormally small window indicates TCP starvation attack.",
        "severity_hint": "Small window → TCP Window starvation",
    },
    "Init_Win_bytes_backward": {
        "description": "TCP window size first advertised by server. Abnormal values indicate abuse of connection capacity.",
        "severity_hint": "Abnormal window → Capacity abuse",
    },
    "act_data_pkt_fwd": {
        "description": "Number of packets carrying actual data in forward direction. High value combined with short flow duration indicates burst attack.",
        "severity_hint": "Short duration + high data → Burst attack",
    },
    "Active Mean": {
        "description": "Average duration of active periods in the flow. Very short active periods indicate high-frequency scanning activity.",
        "severity_hint": "Very short active period → Scan attack",
    },
    "Idle Mean": {
        "description": "Average duration of idle periods in the flow. Long idle periods followed by sudden traffic bursts indicate slow-loris type attacks.",
        "severity_hint": "Long idle + sudden burst → Slow-loris",
    },
}


def get_shap_reasoning(explainer, X_sample: pd.DataFrame, feature_names: list[str], top_n: int = 5) -> list[dict]:
    feature_names_list = list(feature_names)
    n_features = len(feature_names_list)

    shap_values = explainer.shap_values(X_sample)
    arr = np.array(shap_values)  # (1, 45, 12)

    # (1, n_features, n_classes) → (n_features, n_classes)
    arr = arr.squeeze(0)  # → (45, 12)

    # Her class için toplam mutlak SHAP — en etkili sınıfı seç
    class_totals = np.abs(arr).sum(axis=0)   # (12,)
    pred_class   = int(np.argmax(class_totals))

    raw = arr[:, pred_class]  # (45,) — bu sample için o sınıfın SHAP değerleri

    abs_shap    = np.abs(raw)
    top_indices = np.argsort(abs_shap)[::-1][:top_n]

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
            reasoning = get_shap_reasoning(mc_explainer, X_mc, mc_feats, top_n=5)
        except Exception as e:
            print(f"SHAP error (non-fatal): {e}")
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


@app.get("/")
def root():
    return {"status": "IDS SOC Engine Online", "version": "2.1", "xai": "SHAP TreeExplainer"}

@app.get("/debug/shap")
def debug_shap():
    sample = holdout_df[holdout_df["label_multiclass"] != 0].sample(1)
    X_raw  = sample.drop(columns=[c for c in sample.columns if "label" in c.lower()])
    X_mc   = X_raw.reindex(columns=mc_feats, fill_value=0)
    
    sv = mc_explainer.shap_values(X_mc)
    
    if isinstance(sv, list):
        shapes = [np.array(s).shape for s in sv]
        return {
            "type": "list",
            "n_classes": len(sv),
            "shapes": [str(s) for s in shapes],
            "n_features_expected": len(mc_feats),
        }
    else:
        return {
            "type": "array",
            "shape": str(np.array(sv).shape),
            "n_features_expected": len(mc_feats),
        }