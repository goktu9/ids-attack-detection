"""
Test setini N mock user'a böler.
Çalıştır: python split_test_data.py
"""
from pathlib import Path
import pandas as pd
import numpy as np

RANDOM_STATE = 42
N_USERS      = 5
LABEL_COL    = "label_multiclass"  # "label_binary" olarak da değiştirilebilir

HERE = Path(__file__).resolve().parent
SRC  = HERE / f"holdout_test_{LABEL_COL}.csv"
OUT  = HERE / "test_splits"
OUT.mkdir(parents=True, exist_ok=True)

# --- Hata kontrolü ---
if not SRC.exists():
    raise FileNotFoundError(
        f"Holdout test dosyası bulunamadı: {SRC}\n"
        f"Önce 09_model_export_and_federated.ipynb çalıştırın."
    )

df = pd.read_csv(SRC)
print(f"Toplam test satırı: {len(df):,}")
print(f"Label kolonu: {LABEL_COL}")

# Karıştır ve böl
df = df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)

indices = np.array_split(df.index, N_USERS)
chunks = [df.loc[idx].reset_index(drop=True) for idx in indices]

print(f"\n{N_USERS} parçaya bölünüyor:")
for i, chunk in enumerate(chunks, start=1):
    out_path = OUT / f"user_{i}_test.csv"
    chunk.to_csv(out_path, index=False)
    print(f"  user_{i}_test.csv : {len(chunk):,} satır")

print("\n✓ Tüm parçalar oluşturuldu.")