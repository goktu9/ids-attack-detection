# Federated Learning (FedAvg) Simulation

This folder replaces the old federated evaluation scripts with a true FedAvg-based federated learning simulation.

## What this does
- Splits the dataset into a global holdout test set and client training partitions.
- Trains a local neural network model on each client.
- Aggregates client model weights with sample-weighted FedAvg.
- Evaluates the global model after each communication round.
- Saves CSV/JSON/TXT results under `federated/results/`.
- Saves the final global model under `models/fedavg_ids_mlp.pt`.

## Basic run
From the project root:

```bash
python federated/main_federated_learning.py --data data/featured_dataset.csv --clients 5 --rounds 5 --local-epochs 2
```

## Fast test run
```bash
python federated/main_federated_learning.py --data data/featured_dataset.csv --max-rows 50000 --clients 5 --rounds 3 --local-epochs 1
```

## Outputs
- `federated/results/fedavg_round_history.csv`
- `federated/results/fedavg_client_holdout_results.csv`
- `federated/results/fedavg_final_results.json`
- `federated/results/fedavg_classification_report.txt`
- `models/fedavg_ids_mlp.pt`
- `models/fedavg_preprocessing.pkl`
