# Autonomous Continuous Learning Pipeline Guide

This guide details the design, configuration, and implementation of the **Autonomous Continuous Learning Pipeline** integrated into the WSN Platform. It replaces manual model training scripts with an automated, validation-gated model retraining and deployment manager.

---

## 🏗️ Architecture Design

```text
  +----------------------------------+
  |    wsn_dataset.csv (Ingestion)   |
  +----------------+-----------------+
                   |
                   | (Monitors Rows & Time)
                   v
  +----------------+-----------------+
  |    Training Manager Service      | <----+ (Trigger Retraining)
  +----------------+-----------------+      |
                   |                        |
                   | (Train Candidates)     | (settings.json thresholds)
                   v                        |
  +----------------+-----------------+      |
  | Validation & Champion Comparison | -----+
  +----------------+-----------------+
                   |
                   | (If Performance Improves)
                   v
  +----------------+-----------------+
  |      Model Registry Update       |
  |      (registry.json & .pkl)      |
  +----------------+-----------------+
                   |
                   | (Auto-serve predictions)
                   v
  +----------------+-----------------+
  |      FastAPI REST Router         |
  |  (/api/models/current, etc.)     |
  +----------------------------------+
```

### 1. Training Manager Service
*   **Daemon Process**: Runs as a background service (`src/ml/training_manager.py`) checking the ingestion dataset at a configured interval.
*   **Non-Blocking**: Training runs independently from the MQTT subscriber thread to ensure packet ingestion latency is unaffected.

### 2. Retraining Policy
Retraining is triggered only if **both** of the following conditions are satisfied:
1.  **New Samples Count**: At least `500` (or `min_new_samples` in settings) new rows have been appended to the master dataset since the last successful training run.
2.  **Cooldown Period**: At least `24` hours (or `min_time_elapsed_hours` in settings) have elapsed since the last model deployment.

### 3. Model Registry & Versioning
*   All models are saved using versioned filenames in the `models/` directory (e.g., `temp_model_v1.pkl`, `temp_model_v2.pkl`) rather than overwriting.
*   The model registry (`models/registry.json`) acts as the single source of truth, storing:
    *   `active_version` (tracks the currently deployed version)
    *   `history` (complete log of all trained versions with MAE, RMSE, R² metrics, training dates, dataset sizes, and status).
*   **Champion/Candidate Evaluation**:
    *   Candidate models are trained on 80% of the dataset.
    *   Candidates are evaluated against the currently active model on the remaining 20% validation set.
    *   The candidate is deployed **only** if its validation $R^2$ score is strictly higher than the active model's $R^2$ score.

---

## ⚙️ Configuration (`settings.json`)

Configure retraining thresholds under the `retraining` block:
```json
    "retraining": {
        "check_interval_seconds": 15,
        "min_new_samples": 500,
        "min_time_elapsed_hours": 24
    }
```

---

## 📡 Exposed REST API Endpoints

1.  **`GET /api/models`**:
    *   Returns the complete registry containing active versions and historical training logs for all models.
2.  **`GET /api/models/current`**:
    *   Returns the active version of each model combined with its current validation performance metrics.
3.  **`GET /api/models/history`**:
    *   Returns a chronologically sorted history of all training runs across all model keys.

---

## 🔄 Verification & Testing

### Running the Training Manager Daemon
To start the background training manager:
```bash
.venv\Scripts\python src/ml/training_manager.py
```

### Inspecting Logs
All retraining attempts, evaluations, deployments, and validation details are logged to `data/logs/training.log`:
```text
2026-06-28 00:15:58,353 - INFO - --- Continuous Learning Training Manager Online ---
2026-06-28 00:15:58,354 - INFO - Registry missing on startup. Running bootstrap training...
2026-06-28 00:15:58,354 - INFO - Starting model training pipeline...
2026-06-28 00:15:58,564 - INFO - Model temp_model version v1 deployed successfully.
...
2026-06-28 00:16:03,044 - INFO - Current dataset size: 2433 rows. Last training size: 2433 rows. New samples: 0 (target: 500).
2026-06-28 00:16:03,044 - INFO - Hours elapsed since last training: 0.00 hours (target: 24 hours).
2026-06-28 00:16:03,044 - INFO - Retraining trigger conditions NOT satisfied. Skipping.
```
