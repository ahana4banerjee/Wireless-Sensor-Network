# Intelligent Wireless Sensor Network (WSN) Simulation

## 1. Project Overview & Vision
This repository houses the end-to-end implementation of an **Intelligent Wireless Sensor Network (WSN)** using a **simulation-first development approach**.

Rather than immediately programming physical microcontrollers, we construct the complete telemetry routing, MQTT messaging, data ingestion, stateful diagnostic alarm monitoring, machine learning analytics, and visual front-end dashboard layers entirely in software. This decouples the infrastructure so that as we shift across different phases, **only the sensor nodes change**—the MQTT broker configuration, backend processing engines, ML forecasting pipelines, and frontend dashboards remain completely reusable.

```text
Phase 1: Python Virtual Nodes ────┐
                                   │
Phase 2: PICSimLab Hardware ───────┼─► [MQTT Broker] ─► [Python Backend] ─► [React UI]
                                   │
Phase 3: Physical ESP8266/Arduino ─┘
```

---

## 2. Development Roadmap

### Phase 1: Software Simulation (100% Completed)
Build the complete WSN ecosystem using Python-based virtual sensor nodes fetching real meteorological conditions.
*   **Virtual Node Simulation**: Modeled cities (Hyderabad, Delhi, Mumbai, Bangalore, Secunderabad) streaming telemetry containing real-world OpenWeather readings, battery discharge loops, Gaussian RSSI noise, sequence trackers, latency, and packet loss rates.
*   **Ingestion Backend**: Implemented a multithreaded subscriber processor with auto-migrating CSV schemas, rotating file loggers, and a background watchdog monitoring node timeouts.
*   **Rule-Based Fault Diagnostics**: Built an engine tracking operational thresholds to generate alerts, log incidents, and self-resolve state alarms.
*   **Machine Learning Analytics**: Implemented Isolation Forest anomaly detection, Linear Regression weather forecasters, and comparative Gradient Boosting Regressors for network telemetry.
*   **React Dashboard**: Implemented an SVG topological network canvas, dynamic flows, live scrolling event stream feed, dynamic code-splitting (lazy loading), skeleton loaders, and artificial delays for visual click confirmation.

### Phase 2: Hardware Simulation (Upcoming)
Replace the virtual Python sensor nodes with simulated microcontroller hardware boards within the **PICSimLab** simulator environment.
*   Program simulated nodes to transmit equivalent payloads over MQTT.
*   Retain backend databases, ML pipelines, APIs, and client dashboards without modification.

### Phase 3: Physical ESP8266/Arduino Implementation (Future)
Deploy the system on actual physical hardware modules:
*   Flash **ESP8266** or **Arduino** microcontrollers fitted with DHT11/BMP280 environmental sensors.
*   Transmit metrics directly via local Wi-Fi networks to the Mosquitto broker, maintaining the rest of the operational stack.

---

## 3. Layered Architecture

```text
            [ Virtual / Physical Sensor Nodes ]
           (Delhi, Hyd, Mum, Blr, Secunderabad)
                            │
                            ▼  (MQTT Topics: wsn/{city}/data & wsn/{city}/status)
                    [ MQTT Broker ]
                   (Mosquitto Server)
                            │
                            ▼
                   [ Python Backend ] ◄──► [ Real-Time Master CSV Dataset ]
          (Watchdog, Schema Migrator, Logger, Fault Diagnostics)
                            │
                            ▼
                 [ ML Analytics Pipeline ]
      (Isolation Forest Anomaly, Gradient Boosting, LR)
                            │
                            ▼
                   [ FastAPI Server ]
             (REST Gateway & CORs Mapping)
                            │
                            ▼
               [ React Client Dashboard ]
       (SVG Topology, Event Stream, Skeleton UI, Recharts)
```

*   **Sensor Node Layer**: Implemented in [`node.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/node.py). Simulates energy loss, RSSI attenuation, latency spikes, and fetches real weather payload data. Includes a battery auto-wrap-around to simulate field maintenance/replacement once energy drops to `0%`.
*   **MQTT Communication Layer**: Manages data transport via local broker endpoints (Mosquitto). Low-frequency topics transmit environmental logs (`wsn/{city}/data`), while high-frequency topics carry operational status packets (`wsn/{city}/status`).
*   **Backend Processor Layer**: Implemented in [`backend.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/backend.py). Operates background listeners, Rotating File logging handlers to `data/logs/backend.log`, real-time CSV master dataset appending to `wsn_dataset.csv`, and a node state watchdog.
*   **REST API Layer (FastAPI)**: Implemented in [`src/api/main.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/api/main.py). Exposes structured Pydantic models for nodes health, anomalies, analytics metrics, alerts, and model prediction results.
*   **React Dashboard Layer**: Built under [`dashboard/`](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/). Renders interactive topology schemas, charts, historical tabular registers, and live operational notifications.

---

## 4. Machine Learning & Forecasting Pipelines

The project integrates three machine learning and statistical evaluation pipelines to provide predictive maintenance and diagnostic insights:

### A. Unsupervised Anomaly Detection
*   **Script**: [`anomaly_detection.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/anomaly_detection.py)
*   **Algorithm**: `IsolationForest` (contamination factor = 0.05) trained on normalized meteorological variables.
*   **Purpose**: Flags structural outliers (extreme weather spikes, incorrect data entries) and writes an `anomaly_flag` directly into the unified dataset logs.

### B. Environmental Telemetry Forecasting
*   **Script**: [`environment_predictor.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/environment_predictor.py)
*   **Algorithm**: Linear Regression.
*   **Performance**:
    *   **Temperature Model**: Explains 80.95% of variance ($R^2 \approx 0.81$) with a Mean Absolute Error (MAE) of $0.99^\circ\text{C}$.
    *   **Humidity Model**: Explains 57.09% of variance ($R^2 \approx 0.57$) with an MAE of $8.03\%$.
*   **Report**: Detailed metrics and feature coefficients are recorded in [`reports/environmental_prediction_report.txt`](file:///d:/Projects/College/Wireless-Sensor-Network/reports/environmental_prediction_report.txt).

### C. Network Parameter Predictive Benchmarking
Predicts critical diagnostics indicators (Battery Level, Latency, and Packet Loss) using two distinct predictive models:
1.  **Baseline Model (Linear Regression)**: Implemented in [`network_predictor.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/network_predictor.py). Regresses static telemetry parameters directly. Yields poor performance ($R^2 \approx 0.003$ for battery, and negative $R^2$ for latency) due to target leakage and non-linear spikes.
2.  **Advanced Model (Gradient Boosting Regressor)**: Implemented in [`network_predictor_v2.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/network_predictor_v2.py). Mitigates leakage using 1-step lag values, rates of change, sequence progress indicators, elapsed runtime, and 5-step rolling window summaries (means and standard deviations). Chronological out-of-time splitting (80% train, 20% test) is applied to evaluate prediction bounds.
    *   **Battery Decay Model**: Achieves an $R^2$ of **0.9721** (MAE reduced by 90.05% down to $2.49\%$).
    *   **Packet Loss Model**: Achieves an $R^2$ of **0.7519** (MAE reduced by 56.91% down to $0.37\%$).
*   **Report**: Comparative statistics are compiled inside [`reports/model_comparison_report.txt`](file:///d:/Projects/College/Wireless-Sensor-Network/reports/model_comparison_report.txt).

---

## 5. Deterministic Network Health Index (NHI)

To avoid predictions fluctuation, the simulation utilizes a deterministic engineering **Network Health Index (NHI)** to score grid status:
*   **Subscore Components**:
    *   **Battery Score (35%)**: Direct percentage metrics.
    *   **Signal Score (25%)**: Normalizes RSSI signal attenuation from $[-100.0, -30.0]$ dBm.
    *   **Latency Score (20%)**: Normalizes transmission delays from $[0.0, 1500.0]$ ms.
    *   **Packet Loss Score (20%)**: Normalizes packet failure rates from $[0.0, 10.0]\%$.
*   **Weighted Formula**:
    $$\text{NHI} = 0.35 \times \text{Battery} + 0.25 \times \text{Signal} + 0.20 \times \text{Latency} + 0.20 \times \text{Packet Loss}$$
*   **Classification Levels**:
    *   `90.0 - 100.0` ➔ EXCELLENT
    *   `75.0 - 89.9` ➔ GOOD
    *   `60.0 - 74.9` ➔ WARNING
    *   `40.0 - 59.9` ➔ CRITICAL
    *   `0.0 - 39.9` ➔ FAILING
*   **Report**: Complete mathematical formulations and data summaries are persisted in [`reports/network_health_report.txt`](file:///d:/Projects/College/Wireless-Sensor-Network/reports/network_health_report.txt).

---

## 6. Setup & Execution Instructions

### A. Environment Configuration
1.  Initialize a Python virtual environment:
    ```bash
    python -m venv .venv
    ```
2.  Activate the environment and install dependencies:
    ```bash
    # Windows:
    .venv\Scripts\activate
    pip install -r requirements.txt
    
    # macOS/Linux:
    source .venv/bin/activate
    pip install -r requirements.txt
    ```
3.  Configure your OpenWeather API key inside a `.env` file in the root directory:
    ```env
    WEATHER_API_KEY=your_openweather_api_key
    ```
4.  Ensure an MQTT Broker (e.g. Mosquitto) is running locally on port `1883`.

### B. Launching WSN Backend & Sensors
1.  **Start Ingestor & Watchdog**:
    ```bash
    python src/backend.py
    ```
    *(Cleans historical schema columns and listens for city broker topics)*
2.  **Start Telemetry Nodes**:
    *   Launch all nodes concurrently:
        ```bash
        python main.py
        ```
    *   Or run a single city node manually:
        ```bash
        python src/node.py --city Delhi
        ```

### C. Running ML & Reporting Pipelines
1.  **Train Weather Forecasters**:
    ```bash
    python src/ml/environment_predictor.py
    ```
2.  **Train Network Parameter Predictors (LR & Gradient Boosting)**:
    ```bash
    python src/ml/network_predictor_v2.py
    ```
3.  **Execute Diagnostic History & Health Summarizer**:
    ```bash
    python src/utils/update_battery_history.py
    ```
    *(Standardizes database metrics, updates battery curves, and computes NHI summaries)*

### D. Starting REST Gateway and Frontend UI
1.  **Launch FastAPI REST Server**:
    ```bash
    uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
    ```
2.  **Run Client Dashboard**:
    ```bash
    cd dashboard
    npm install
    npm run dev
    ```

---

## 7. Frontend UI Features & Optimizations

The Client dashboard operates as a premium dark-mode WSN control room:
*   **Mission Control SVG Topology**: A vector connection blueprint mapping node states (Green, Yellow, Red) and displaying active traffic animation paths (`flow-line-active` dash offsets) which dynamically pause on offline nodes.
*   **Live Event Stream**: An auto-scrolling sidebar recording MQTT handshakes, latency warnings, battery alerts, and anomaly triggers categorized by operational risk level.
*   **Route Code-Splitting**: Uses `React.lazy()` and `<Suspense>` in [`App.jsx`](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/src/App.jsx) to split route dependencies into compact dynamic bundle chunks, reducing startup load overhead.
*   **Visibility Caching**: Uses a `visitedPages` state registry to cache loaded components. When switching tabs, previously opened pages are hidden via CSS classes rather than unmounted, preserving Recharts rendering histories and layouts.
*   **Visual Skeleton Placeholders**: Embeds custom loaders (`CardSkeleton`, `TableSkeleton`, `TopologySkeleton`, `SettingsSkeleton`, `ChartSkeleton`) to handle network queries without global screen flickering.
*   **Action Spinners and Delays**: Added artificial 2.0-second delay wrappers on the **Save Configuration**, **Reset Defaults**, and **Force Refresh** callbacks to show consistent loading indicator animations.
