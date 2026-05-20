"""
Federated Learning Simulation — Main Aggregator
1) Runs each user script
2) Collects results
3) Computes simple + weighted average
4) Prints and saves summary table

Run: python main_federated_simulation.py
"""
from pathlib import Path
import json
import subprocess
import sys
import pandas as pd

HERE        = Path(__file__).resolve().parent
RESULTS_DIR = HERE / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

N_USERS = 5

print("=" * 70)
print("FEDERATED LEARNING SİMÜLASYONU — AGGREGATOR")
print("=" * 70)

# ─── 1) Her user script'ini çalıştır ─────────────────────────────────────────
for i in range(1, N_USERS + 1):
    script = HERE / f"user_{i}.py"
    if not script.exists():
        print(f"[UYARI] {script.name} bulunamadı, atlanıyor.")
        continue
    print(f"\n--- {script.name} çalışıyor ---")
    result = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True, text=True
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"[HATA] {script.name} başarısız:")
        print(result.stderr)

# ─── 2) Sonuçları topla ──────────────────────────────────────────────────────
records = []
for i in range(1, N_USERS + 1):
    p = RESULTS_DIR / f"user_{i}_results.json"
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            records.append(json.load(f))
    else:
        print(f"[UYARI] {p.name} bulunamadı.")

if not records:
    sys.exit("[HATA] Hiç sonuç dosyası bulunamadı. Önce user script'lerini çalıştırın.")

df = pd.DataFrame(records).set_index("user_id")

print("\n" + "=" * 70)
print("KULLANICI BAZLI SONUÇLAR")
print("=" * 70)
print(df.to_string())

# ─── 3) Ortalama hesapla ──────────────────────────────────────────────────────
metric_cols = ["accuracy", "precision_w", "recall_w", "f1_weighted", "f1_macro"]

# Simple average
simple_avg = df[metric_cols].mean()

# Weighted average (sample sayısına göre)
weights = df["n_samples"] / df["n_samples"].sum()
weighted_avg = (df[metric_cols].T * weights).T.sum()

summary = pd.DataFrame({
    "simple_avg":   simple_avg,
    "weighted_avg": weighted_avg
}).round(4)

print("\n" + "=" * 70)
print("FEDERATED ÖZET (Simple vs Weighted Average)")
print("=" * 70)
print(summary.to_string())

# ─── 4) Kaydet ────────────────────────────────────────────────────────────────
df.to_csv(RESULTS_DIR / "all_users_results.csv")
summary.to_csv(RESULTS_DIR / "federated_summary.csv")

print(f"\n✓ Kullanıcı sonuçları : {RESULTS_DIR / 'all_users_results.csv'}")
print(f"✓ Federated özet     : {RESULTS_DIR / 'federated_summary.csv'}")

print("\n" + "=" * 70)
print("SİMÜLASYON TAMAMLANDI")
print("=" * 70)