
# 🛡️ AI-Powered Network Attack Detection System and Analyst Dashboard

This repository contains the source code, trained model files, experimental notebooks, documentation, and final project reports for the graduation project:

**AI-Powered Network Attack Detection System and Analyst Dashboard**

The project develops an end-to-end intrusion detection prototype that combines machine learning-based network attack detection with a **FastAPI backend** and a **React/Next.js analyst dashboard**. The system classifies network traffic as benign or malicious, predicts the attack category for malicious traffic, and visualizes alerts with dashboard-level statistics and SHAP-based explainability.

---

## 📌 Project Overview

Traditional rule-based intrusion detection systems may be insufficient against evolving attack patterns and large-scale network traffic. This project proposes a machine learning-based intrusion detection prototype using the **CIC-IDS2017** dataset.

The system includes:

- Binary network traffic classification: **Benign / Attack**
- Multiclass attack classification
- Feature engineering and leakage analysis
- Random Forest, XGBoost, and CatBoost model comparison
- SHAP-based per-sample explainability
- FastAPI backend integration
- React/Next.js analyst dashboard
- FedAvg-based federated learning simulation
- Final thesis, article, poster, and references

---

## 📁 Repository Structure

```text
ids-attack-detection/
├── backend/              # FastAPI backend service
├── frontend/             # React / Next.js analyst dashboard
├── notebooks/            # Data processing, feature engineering, modeling, and evaluation notebooks
├── models/               # Exported machine learning and federated learning model files
├── federated/            # FedAvg federated learning simulation files and results
├── data/plots/           # Generated experimental plots and figures
├── reports/              # Leakage and skewness comparison outputs
├── docs/                 # Final thesis, article, poster, and references
├── README.md
└── .gitignore
```

## 🧩 Main Components

### 1. Machine Learning Pipeline

The machine learning pipeline includes:

- CIC-IDS2017 dataset preparation
- Data cleaning and preprocessing
- Controlled sampling
- Feature engineering
- Correlation filtering
- Mutual information-based feature analysis
- Skewness analysis
- Data leakage analysis
- Binary and multiclass model training
- Model comparison and evaluation
- Model export for backend integration

The final deployed models are based on **Random Forest**, selected due to strong macro F1-score, stable performance, deployment simplicity, and compatibility with SHAP-based explanation.

### 2. Backend API

The backend is implemented with **FastAPI**. It loads the exported Random Forest models and provides API endpoints for prediction, recent history, dashboard statistics, and explainability data.

Main backend functions:

- Load binary and multiclass Random Forest models
- Generate real-time-like prediction events
- Return attack type and confidence information
- Store recent events in memory
- Provide dashboard statistics
- Generate SHAP-based feature explanations

### 3. Analyst Dashboard

The frontend dashboard is implemented using **React and Next.js**. It visualizes the outputs of the intrusion detection system in an analyst-oriented interface.

Dashboard features:

- Live prediction feed
- Traffic statistics cards
- Traffic flow chart
- Attack distribution chart
- Recent alerts table
- Severity indicators
- SHAP-based XAI explanation card

### 4. Federated Learning Simulation

In addition to the centralized Random Forest-based IDS pipeline, a **FedAvg-based federated learning simulation** was implemented.

The federated learning experiment uses:

- 5 clients
- 5 communication rounds
- 2 local epochs per round
- 45 selected input features
- Three-layer MLP model
- Sample-weighted FedAvg aggregation

This component demonstrates the feasibility of distributed intrusion detection training without sharing raw client data.

---

## 📊 Dataset

The project uses the **CIC-IDS2017** dataset, a widely used benchmark dataset for network intrusion detection research.

The original dataset is not included in this repository due to file size. The repository contains the project code, generated outputs, exported model files, plots, and final documentation required to understand and run the prototype.

---

## 📈 Final Model Results

### Binary Classification Results

| Model | Split | Accuracy | Weighted F1 | Macro F1 | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Random Forest | Per-file | 0.9985 | 0.9986 | 0.9980 | 1.0000 |
| Random Forest | Time-based | 0.8540 | 0.8197 | 0.6800 | 0.8637 |
| XGBoost | Per-file | 0.9982 | 0.9982 | 0.9975 | 0.9999 |
| CatBoost | Per-file | 0.9982 | 0.9982 | 0.9976 | 0.9999 |

### Multiclass Classification Results

| Model | Split | Accuracy | Weighted F1 | Macro F1 |
|---|---:|---:|---:|---:|
| Random Forest | Per-file | 0.9969 | 0.9969 | 0.9187 |
| Random Forest | Time-based | 0.7957 | 0.7119 | 0.0745 |
| XGBoost | Per-file | 0.9973 | 0.9970 | 0.9025 |
| CatBoost | Per-file | 0.9629 | 0.9710 | 0.8152 |

The per-file evaluation showed strong binary and multiclass performance. However, time-based evaluation demonstrated lower generalization performance, especially for multiclass classification. This indicates that temporal distribution shift remains an important challenge for realistic IDS deployment.

Minority web attack classes, especially **Web Attack - XSS** and **Web Attack - Brute Force**, showed lower F1-score compared to major attack categories due to limited and imbalanced samples.

### FedAvg Federated Learning Results

| Metric | Value |
|---|---:|
| Accuracy | 0.9695 |
| Weighted F1 | 0.9672 |
| Macro F1 | 0.7451 |
| Communication Rounds | 5 |
| Clients | 5 |
| Local Epochs | 2 |

---

## 🚀 How to Run

### Backend

Go to the project root directory and install backend requirements:

```bash
pip install -r backend/requirements.txt
```

Run the FastAPI backend:

```bash
uvicorn backend.main:app --reload
```

Backend local address:

```text
http://127.0.0.1:8000
```

Example endpoints:

```text
GET /
GET /predict/stream
GET /history
GET /history/stats
GET /dashboard/summary
GET /dashboard/traffic
GET /debug/shap
```

### Frontend

Go to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the dashboard:

```bash
npm run dev
```

Frontend local address:

```text
http://localhost:3000
```

---

## 📄 Project Documents

The final project documents are available in the `docs/` directory:

- [Graduation Project Thesis](docs/Graduation_Project_Thesis.pdf)
- [Graduation Project Article](docs/Graduation_Project_Article.pdf)
- [Graduation Project Poster](docs/Graduation_Project_Poster.pdf)
- [References](docs/References.md)

---

## ⚠️ Limitations

The current system is a prototype and has several limitations:

- Real-time monitoring is simulated using preprocessed records instead of live packet capture.
- Event history is stored in memory rather than a persistent database.
- The model was trained and evaluated on CIC-IDS2017, so performance may change on different network environments.
- Minority web attack classes require further improvement.
- The federated learning simulation uses IID client partitioning and is not yet integrated into the production backend.
- The dashboard does not yet include authentication, notification mechanisms, or SIEM integration.

---

## 🔮 Future Work

Possible future improvements include:

- Live packet capture integration using tools such as CICFlowMeter, Zeek, or packet sniffing modules
- Persistent database storage for long-term alert management
- SIEM integration
- Authentication and role-based access control
- Model drift monitoring and periodic retraining
- Improved minority attack class detection
- Non-IID federated learning experiments
- Docker-based deployment

---

## 👥 Authors

**Göktuğ VARAN**  
Department of Computer Engineering  
Biruni University, Istanbul, Turkey  

**Mehmet Taha YILMAZ**  
Department of Computer Engineering  
Biruni University, Istanbul, Turkey  

**Advisor:** **Prof. Dr. Özgür Koray ŞAHİNGÖZ**  
Department of Computer Engineering  
Biruni University, Istanbul, Turkey  

---

## 📄 Academic Use

This repository was prepared as part of a graduation project for academic purposes.
