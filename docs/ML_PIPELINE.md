# Machine Learning & Analytics Pipeline

This document defines the mathematical foundations, features engineering, and retraining protocols of the predictive models on the WSN platform.

---

## 1. Machine Learning Models Index

The platform implements nine model estimators serialized under `models/`:

### 1.1 Unsupervised Outlier Detection (Isolation Forest)
*   **Model File**: `anomaly_model.pkl`
*   **Algorithm**: `IsolationForest(contamination=0.05, random_state=42)`
*   **Inputs**: `temp`, `humidity`, `pressure`, `wind_speed`
*   **Outputs**: `anomaly_flag` (1 for normal, -1 for outliers)
*   **Purpose**: Flags extreme or highly anomalous weather conditions.

### 1.2 Environmental Forecasting (Linear Regression)
*   **Temperature Model** (`temp_model.pkl`): Linear Regression forecasting diurnal temperature.
*   **Humidity Model** (`humidity_model.pkl`): Linear Regression forecasting relative humidity.

### 1.3 Network Parameters Benchmarking (Gradient Boosting)
*   **Models**: `gb_battery_model.pkl`, `gb_latency_model.pkl`, `gb_packet_loss_model.pkl`
*   **Algorithm**: `GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=4)`
*   **Inputs**: Lagged metrics (e.g., previous battery), rolling averages, elapsed runtime, and sequence progress.
*   **Goal**: Captured non-linear behaviors (discharge steps, packet drops, latency jitter) to schedule physical maintenance.

---

## 2. Feature Selection & Engineering

### 2.1 Environmental Models
*   **Temperature Features**: `pressure`, `wind_speed`, `humidity`, `hour`, `day`, `month`
*   **Humidity Features**: `pressure`, `wind_speed`, `temp`, `hour`, `day`, `month`

### 2.2 Network Baseline Linear Models
To prevent underflow issues during OLS solving, the monotonically growing raw timestamp (`unix_ts`) was removed. Baseline models map metrics using contemporaneous variables:
*   **Battery Features**: `signal_strength`, `latency_ms`, `packet_loss_rate`, `anomaly_flag`
*   **Latency Features**: `signal_strength`, `packet_loss_rate`, `battery_level`
*   **Packet Loss Features**: `signal_strength`, `battery_level`, `latency_ms`

### 2.3 Network Gradient Boosting Features (Lagged & Rolling)
*   **Lag Features**: Values shifted by 1 index (e.g., `previous_battery_level`).
*   **Change Rates**: Instantaneous rate of change (e.g., `battery_level` - `previous_battery_level`).
*   **Rolling Statistics**: Rolling mean and standard deviation over a sliding window of size 5.
*   **Runtime Progress**: `elapsed_runtime` and cyclic sequence indexes (`sequence_progress`).

---

## 3. Explanatory & Deterministic Equations

### 3.1 Network Health Index (NHI)
We intentionally avoid using black-box machine learning predictions to estimate network health, as they fluctuate erratically and lack explainability. Instead, we use a deterministic, explainable scoring formula:

$$\text{NHI} = 0.35 \times S_{\text{Battery}} + 0.25 \times S_{\text{Signal}} + 0.20 \times S_{\text{Latency}} + 0.20 \times S_{\text{Loss}}$$

Where each normalized sub-score is bounded between `[0, 100]`:
*   $$S_{\text{Battery}} = \text{battery\_level}$$
*   $$S_{\text{Signal}} = \frac{\text{signal\_strength} + 100}{70} \times 100$$
*   $$S_{\text{Latency}} = \frac{1500 - \text{latency\_ms}}{1500} \times 100$$
*   $$S_{\text{Loss}} = 100 - \text{packet\_loss\_rate}$$

---

## 4. Retraining & Promotions Policy

### 4.1 Retraining Daemon
The retraining manager (`training_manager.py`) runs every 15 seconds, inspecting the database to evaluate retraining triggers. Retraining triggers only when:
1.  **New Samples**: At least `500` records have been added to the master dataset `wsn_dataset.csv` since the last run.
2.  **Cooldown Cooldown**: At least `24` hours have passed since the last training run.

### 4.2 Champion Validation Gates
Retrained candidate models are validation-gated before deployment. The dataset is split into **80% training** and **20% validation** (temporally ordered to avoid future leakage).
The candidate is deployed to production only if its validation $R^2$ score is higher than the currently deployed champion's score:

$$R^2_{\text{candidate}} > R^2_{\text{champion}}$$

If validation fails, the candidate is rejected, and version metrics are logged in `models/registry.json`.
