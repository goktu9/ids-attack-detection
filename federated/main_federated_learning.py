"""
True Federated Learning Simulation for Multiclass IDS
=====================================================

This script implements a real federated learning workflow using FedAvg:

1. Loads a cleaned/featured CICIDS2017 dataset.
2. Creates a global holdout test set that is never used by clients.
3. Splits the remaining training data into multiple client partitions.
4. Sends the current global neural network model to each client.
5. Each client trains locally on its own private partition.
6. The server aggregates client model weights using sample-weighted FedAvg.
7. The global model is evaluated after every communication round.

Important distinction:
- This is full federated learning with local training + communication rounds + FedAvg.
- It is not Random Forest tree aggregation.

Run from project root or from the federated folder:
    python federated/main_federated_learning.py --data data/featured_dataset.csv

If --data is omitted, the script tries common project paths automatically.
"""

from __future__ import annotations

import argparse
import json
import random
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from torch import nn
from torch.utils.data import DataLoader, TensorDataset


# -----------------------------
# Configuration
# -----------------------------
@dataclass
class FLConfig:
    label_col: str = "label_multiclass"
    n_clients: int = 5
    test_size: float = 0.20
    communication_rounds: int = 5
    local_epochs: int = 2
    batch_size: int = 512
    learning_rate: float = 1e-3
    hidden_dim: int = 128
    dropout: float = 0.20
    random_state: int = 42
    max_rows: int = 0  # 0 means use all rows
    iid_split: bool = True


# -----------------------------
# Model
# -----------------------------
class IDSNet(nn.Module):
    def __init__(self, input_dim: int, num_classes: int, hidden_dim: int = 128, dropout: float = 0.20):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# -----------------------------
# Utilities
# -----------------------------
def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


def resolve_data_path(cli_path: str | None, here: Path) -> Path:
    candidates: List[Path] = []
    if cli_path:
        candidates.append(Path(cli_path))

    candidates.extend([
        here / "featured_dataset.csv",
        here / "data" / "featured_dataset.csv",
        here.parent / "featured_dataset.csv",
        here.parent / "data" / "featured_dataset.csv",
        here.parent / "notebooks" / "featured_dataset.csv",
        here.parent / "outputs" / "featured_dataset.csv",
    ])

    for p in candidates:
        if p.exists():
            return p.resolve()
    raise FileNotFoundError(
        "Could not find featured_dataset.csv. Provide it explicitly with --data path/to/featured_dataset.csv"
    )


def load_feature_list(here: Path, df: pd.DataFrame, label_col: str) -> List[str]:
    """Load selected feature list if available; otherwise infer numeric features."""
    candidates = [
        here / "selected_features.txt",
        here.parent / "selected_features.txt",
        here.parent / "data" / "selected_features.txt",
        here.parent / "notebooks" / "selected_features.txt",
    ]

    model_bundle_candidates = [
        here.parent / "models" / "rf_multiclass.pkl",
        here / "models" / "rf_multiclass.pkl",
    ]

    for p in candidates:
        if p.exists():
            features = [line.strip() for line in p.read_text(encoding="utf-8").splitlines() if line.strip()]
            return [f for f in features if f in df.columns and f != label_col]

    for p in model_bundle_candidates:
        if p.exists():
            bundle = joblib.load(p)
            if isinstance(bundle, dict) and "features" in bundle:
                return [f for f in bundle["features"] if f in df.columns and f != label_col]

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    return [c for c in numeric_cols if c != label_col]


def create_client_partitions(
    X: np.ndarray,
    y: np.ndarray,
    n_clients: int,
    seed: int,
    iid_split: bool = True,
) -> List[Tuple[np.ndarray, np.ndarray]]:
    """Create client datasets. IID split preserves class distribution approximately."""
    rng = np.random.default_rng(seed)
    client_indices: List[List[int]] = [[] for _ in range(n_clients)]

    if iid_split:
        for cls in np.unique(y):
            idx = np.where(y == cls)[0]
            rng.shuffle(idx)
            splits = np.array_split(idx, n_clients)
            for i, split in enumerate(splits):
                client_indices[i].extend(split.tolist())
    else:
        all_idx = np.arange(len(y))
        rng.shuffle(all_idx)
        splits = np.array_split(all_idx, n_clients)
        for i, split in enumerate(splits):
            client_indices[i].extend(split.tolist())

    clients = []
    for idx_list in client_indices:
        idx = np.array(idx_list, dtype=int)
        rng.shuffle(idx)
        clients.append((X[idx], y[idx]))
    return clients


def state_dict_to_cpu(state_dict: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    return {k: v.detach().cpu().clone() for k, v in state_dict.items()}


def fedavg(states: List[Dict[str, torch.Tensor]], weights: List[int]) -> Dict[str, torch.Tensor]:
    total = float(sum(weights))
    aggregated: Dict[str, torch.Tensor] = {}
    for key in states[0].keys():
        aggregated[key] = sum(state[key] * (w / total) for state, w in zip(states, weights))
    return aggregated


def train_local_model(
    global_state: Dict[str, torch.Tensor],
    input_dim: int,
    num_classes: int,
    X_local: np.ndarray,
    y_local: np.ndarray,
    cfg: FLConfig,
    device: torch.device,
) -> Dict[str, torch.Tensor]:
    model = IDSNet(input_dim, num_classes, cfg.hidden_dim, cfg.dropout).to(device)
    model.load_state_dict(global_state)
    model.train()

    ds = TensorDataset(
        torch.tensor(X_local, dtype=torch.float32),
        torch.tensor(y_local, dtype=torch.long),
    )
    loader = DataLoader(ds, batch_size=cfg.batch_size, shuffle=True)

    optimizer = torch.optim.Adam(model.parameters(), lr=cfg.learning_rate)
    criterion = nn.CrossEntropyLoss()

    for _ in range(cfg.local_epochs):
        for xb, yb in loader:
            xb = xb.to(device)
            yb = yb.to(device)
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            optimizer.step()

    return state_dict_to_cpu(model.state_dict())


def evaluate_model(
    model: nn.Module,
    X_test: np.ndarray,
    y_test: np.ndarray,
    device: torch.device,
) -> Dict[str, float | List[int]]:
    model.eval()
    preds: List[int] = []
    with torch.no_grad():
        for start in range(0, len(X_test), 4096):
            xb = torch.tensor(X_test[start:start + 4096], dtype=torch.float32).to(device)
            logits = model(xb)
            preds.extend(torch.argmax(logits, dim=1).cpu().numpy().tolist())

    return {
        "accuracy": float(accuracy_score(y_test, preds)),
        "precision_weighted": float(precision_score(y_test, preds, average="weighted", zero_division=0)),
        "recall_weighted": float(recall_score(y_test, preds, average="weighted", zero_division=0)),
        "f1_weighted": float(f1_score(y_test, preds, average="weighted", zero_division=0)),
        "f1_macro": float(f1_score(y_test, preds, average="macro", zero_division=0)),
        "predictions": preds,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default=None, help="Path to featured_dataset.csv")
    parser.add_argument("--label-col", type=str, default="label_multiclass")
    parser.add_argument("--clients", type=int, default=5)
    parser.add_argument("--rounds", type=int, default=5)
    parser.add_argument("--local-epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--max-rows", type=int, default=0, help="Use a sample for faster testing; 0 means all rows")
    parser.add_argument("--non-iid", action="store_true", help="Use simple random split instead of stratified IID client split")
    args = parser.parse_args()

    here = Path(__file__).resolve().parent
    results_dir = here / "results"
    models_dir = here.parent / "models"
    results_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)

    cfg = FLConfig(
        label_col=args.label_col,
        n_clients=args.clients,
        communication_rounds=args.rounds,
        local_epochs=args.local_epochs,
        batch_size=args.batch_size,
        max_rows=args.max_rows,
        iid_split=not args.non_iid,
    )

    set_seed(cfg.random_state)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    data_path = resolve_data_path(args.data, here)
    print("=" * 72)
    print("TRUE FEDERATED LEARNING — FEDAVG IDS SIMULATION")
    print("=" * 72)
    print(f"Data path     : {data_path}")
    print(f"Label column  : {cfg.label_col}")
    print(f"Clients       : {cfg.n_clients}")
    print(f"Rounds        : {cfg.communication_rounds}")
    print(f"Local epochs  : {cfg.local_epochs}")
    print(f"Device        : {device}")

    df = pd.read_csv(data_path)
    if cfg.label_col not in df.columns:
        raise ValueError(f"Label column '{cfg.label_col}' not found in dataset columns.")

    if cfg.max_rows and cfg.max_rows > 0 and len(df) > cfg.max_rows:
        df = df.sample(n=cfg.max_rows, random_state=cfg.random_state).reset_index(drop=True)
        print(f"Using sampled rows: {len(df):,}")

    features = load_feature_list(here, df, cfg.label_col)
    if not features:
        raise ValueError("No usable feature columns found.")

    df = df[features + [cfg.label_col]].replace([np.inf, -np.inf], np.nan).dropna().reset_index(drop=True)

    le = LabelEncoder()
    y_all = le.fit_transform(df[cfg.label_col].astype(str))
    X_all = df[features].astype(np.float32).values

    # Global holdout is separated before client splitting. Clients never train on this holdout.
    X_train, X_test, y_train, y_test = train_test_split(
        X_all,
        y_all,
        test_size=cfg.test_size,
        random_state=cfg.random_state,
        stratify=y_all,
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train).astype(np.float32)
    X_test = scaler.transform(X_test).astype(np.float32)

    clients = create_client_partitions(X_train, y_train, cfg.n_clients, cfg.random_state, cfg.iid_split)

    input_dim = X_train.shape[1]
    num_classes = len(le.classes_)
    global_model = IDSNet(input_dim, num_classes, cfg.hidden_dim, cfg.dropout).to(device)

    print(f"Features      : {input_dim}")
    print(f"Classes       : {num_classes} -> {list(le.classes_)}")
    print(f"Train samples : {len(X_train):,}")
    print(f"Holdout test  : {len(X_test):,}")
    for i, (_, y_c) in enumerate(clients, start=1):
        print(f"  Client {i}: {len(y_c):,} samples, {len(np.unique(y_c))} classes")

    history: List[Dict[str, float | int]] = []
    client_summary_rows: List[Dict[str, float | int | str]] = []

    for rnd in range(1, cfg.communication_rounds + 1):
        print("\n" + "-" * 72)
        print(f"Communication Round {rnd}/{cfg.communication_rounds}")
        print("-" * 72)

        global_state = state_dict_to_cpu(global_model.state_dict())
        local_states: List[Dict[str, torch.Tensor]] = []
        local_weights: List[int] = []

        for cid, (X_c, y_c) in enumerate(clients, start=1):
            local_state = train_local_model(global_state, input_dim, num_classes, X_c, y_c, cfg, device)
            local_states.append(local_state)
            local_weights.append(len(y_c))

            # Evaluate local model on global holdout for diagnostics only.
            local_model = IDSNet(input_dim, num_classes, cfg.hidden_dim, cfg.dropout).to(device)
            local_model.load_state_dict(local_state)
            local_eval = evaluate_model(local_model, X_test, y_test, device)
            client_summary_rows.append({
                "round": rnd,
                "client": cid,
                "train_samples": len(y_c),
                "holdout_accuracy": round(float(local_eval["accuracy"]), 6),
                "holdout_weighted_f1": round(float(local_eval["f1_weighted"]), 6),
                "holdout_macro_f1": round(float(local_eval["f1_macro"]), 6),
            })
            print(
                f"Client {cid}: samples={len(y_c):,}, "
                f"holdout_acc={local_eval['accuracy']:.4f}, "
                f"holdout_wf1={local_eval['f1_weighted']:.4f}, "
                f"holdout_macro_f1={local_eval['f1_macro']:.4f}"
            )

        aggregated_state = fedavg(local_states, local_weights)
        global_model.load_state_dict(aggregated_state)

        global_eval = evaluate_model(global_model, X_test, y_test, device)
        round_record = {
            "round": rnd,
            "accuracy": round(float(global_eval["accuracy"]), 6),
            "precision_weighted": round(float(global_eval["precision_weighted"]), 6),
            "recall_weighted": round(float(global_eval["recall_weighted"]), 6),
            "f1_weighted": round(float(global_eval["f1_weighted"]), 6),
            "f1_macro": round(float(global_eval["f1_macro"]), 6),
        }
        history.append(round_record)
        print(
            f"GLOBAL after round {rnd}: "
            f"acc={global_eval['accuracy']:.4f}, "
            f"wf1={global_eval['f1_weighted']:.4f}, "
            f"macro_f1={global_eval['f1_macro']:.4f}"
        )

    final_eval = evaluate_model(global_model, X_test, y_test, device)
    preds = final_eval.pop("predictions")

    report_text = classification_report(
        y_test,
        preds,
        target_names=[str(c) for c in le.classes_],
        zero_division=0,
    )

    pd.DataFrame(history).to_csv(results_dir / "fedavg_round_history.csv", index=False)
    pd.DataFrame(client_summary_rows).to_csv(results_dir / "fedavg_client_holdout_results.csv", index=False)

    final_results = {
        "config": asdict(cfg),
        "data_path": str(data_path),
        "n_features": input_dim,
        "features": features,
        "classes": [str(c) for c in le.classes_],
        "train_samples": int(len(X_train)),
        "holdout_samples": int(len(X_test)),
        "final_accuracy": float(final_eval["accuracy"]),
        "final_precision_weighted": float(final_eval["precision_weighted"]),
        "final_recall_weighted": float(final_eval["recall_weighted"]),
        "final_f1_weighted": float(final_eval["f1_weighted"]),
        "final_f1_macro": float(final_eval["f1_macro"]),
    }

    with open(results_dir / "fedavg_final_results.json", "w", encoding="utf-8") as f:
        json.dump(final_results, f, indent=2, ensure_ascii=False)

    with open(results_dir / "fedavg_classification_report.txt", "w", encoding="utf-8") as f:
        f.write(report_text)

    torch.save({
        "model_state_dict": global_model.state_dict(),
        "input_dim": input_dim,
        "num_classes": num_classes,
        "features": features,
        "classes": [str(c) for c in le.classes_],
        "config": asdict(cfg),
    }, models_dir / "fedavg_ids_mlp.pt")

    joblib.dump({"scaler": scaler, "label_encoder": le}, models_dir / "fedavg_preprocessing.pkl")

    print("\n" + "=" * 72)
    print("FINAL FEDAVG GLOBAL MODEL RESULTS")
    print("=" * 72)
    print(f"Accuracy    : {final_results['final_accuracy']:.4f}")
    print(f"Weighted F1 : {final_results['final_f1_weighted']:.4f}")
    print(f"Macro F1    : {final_results['final_f1_macro']:.4f}")
    print("\nSaved outputs:")
    print(f"  {results_dir / 'fedavg_round_history.csv'}")
    print(f"  {results_dir / 'fedavg_client_holdout_results.csv'}")
    print(f"  {results_dir / 'fedavg_final_results.json'}")
    print(f"  {models_dir / 'fedavg_ids_mlp.pt'}")
    print("=" * 72)


if __name__ == "__main__":
    main()
