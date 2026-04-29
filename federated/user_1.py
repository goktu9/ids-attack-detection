"""
Mock Federated Client — User 1
Kaydedilmiş modeli yükler, kendi test verisinde prediction yapar,
metrikleri JSON olarak kaydeder.

Çalıştır: python user_1.py
"""
from pathlib import Path
import pandas as pd
import numpy as np
import joblib
import json
import sys

# ─── KONFİGÜRASYON ──────────────────────────────────────────────────────────
USER_ID   = 1
LABEL_COL = "label_multiclass"  # "label_binary" olarak da değiştirilebilir
# ──────────────────────────────────────────────────────────────────────────────

HERE       = Path(__file__).resolve().parent
MODEL_PATH = HERE.parent / "models" / "rf_multiclass.pkl"
TEST_PATH  = HERE / "test_splits" / f"user_{USER_ID}_test.csv"
OUT_DIR    = HERE / "results"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH   = OUT_DIR / f"user_{USER_ID}_results.json"

# ─── HATA KONTROLLERİ ────────────────────────────────────────────────────────
if not MODEL_PATH.exists():
    sys.exit(f"[HATA] Model dosyası bulunamadı: {MODEL_PATH}")

if not TEST_PATH.exists():
    sys.exit(f"[HATA] Test CSV dosyası bulunamadı: {TEST_PATH}")

# ─── MODEL YÜKLEME ───────────────────────────────────────────────────────────
bundle   = joblib.load(MODEL_PATH)
model    = bundle["model"]
features = bundle["features"]

# ─── TEST VERİSİ OKUMA ───────────────────────────────────────────────────────
df = pd.read_csv(TEST_PATH)

# Feature kolon kontrolü
missing = [f for f in features if f not in df.columns]
if missing:
    sys.exit(f"[HATA] Test CSV'de eksik feature kolonları ({len(missing)}): {missing[:5]}...")

if LABEL_COL not in df.columns:
    sys.exit(f"[HATA] Test CSV'de '{LABEL_COL}' kolonu bulunamadı.")

# ─── TAHMİN VE DEĞERLENDİRME ─────────────────────────────────────────────────
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score
)

X = df[features].fillna(0)
y = df[LABEL_COL]
y_pred = model.predict(X)

results = {
    "user_id":     USER_ID,
    "n_samples":   int(len(df)),
    "label_col":   LABEL_COL,
    "accuracy":    float(accuracy_score(y, y_pred)),
    "precision_w": float(precision_score(y, y_pred, average="weighted", zero_division=0)),
    "recall_w":    float(recall_score(y, y_pred, average="weighted", zero_division=0)),
    "f1_weighted": float(f1_score(y, y_pred, average="weighted", zero_division=0)),
    "f1_macro":    float(f1_score(y, y_pred, average="macro", zero_division=0)),
}

# ─── KAYDETME ─────────────────────────────────────────────────────────────────
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f"User {USER_ID} — {results['n_samples']} sample")
print(json.dumps(results, indent=2))