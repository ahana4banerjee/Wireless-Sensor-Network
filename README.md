# Intelligent Wireless Sensor Network (WSN) Platform & Simulation
> An Intelligent Wireless Sensor Network Platform for Predictive Environmental and Network Analytics

---

## 1. Project Overview & Banner

The **Intelligent Wireless Sensor Network (WSN) Platform & Simulation** is a robust, modular platform engineered to bridge the gap between software-based network prototyping and physical hardware deployment. 

Following a strict **simulation-first development philosophy**, the system models the complete physical, environmental, and networking behavior of a multi-node sensor grid entirely in software. This approach enables developers to construct and validate databases, ingestion gateways, machine learning forecasting engines, stateful fault diagnostic loggers, and operational dashboards before deploying code to physical hardware.

By utilizing lightweight publish-subscribe protocols (MQTT), asynchronous API gateways, and dynamic frontend caching, the platform delivers an enterprise-grade Network Operations Center (NOC) environment. The system decouples telemetry generation from downstream analytics. Under this modular scheme, as the project scales through hardware iterations, **only the sensor nodes change**—the rest of the infrastructure remains reusable and unchanged.

---

## 2. Why This Project Exists

Traditional Wireless Sensor Network (WSN) development is heavily constrained by a hardware-first workflow, presenting several engineering challenges:
1.  **Debugging Bottlenecks**: Pinpointing failures (e.g., packet losses or memory leaks) on bare-metal microcontrollers (such as ESP8266 or Arduino boards) is slow, often requiring hardware-level instrumentation.
2.  **RF Noise and Propagation Variables**: Natural indoor and outdoor RF interference introduces unpredictable packet dropouts and signal attenuation that are difficult to reproduce under laboratory conditions.
3.  **High Prototyping Overhead**: Procuring physical hardware, custom shields, and environmental sensors across multiple regional points is costly and scales poorly during early architectural iterations.

This platform resolves these issues by dividing the project into a three-step progression:

$$\text{Software Simulation (Phase 1)} \Longrightarrow \text{Simulated Hardware (Phase 2)} \Longrightarrow \text{Physical Embedded Hardware (Phase 3)}$$

Developers can prototype, test regression models, and tune alarm thresholds in a sandbox environment before transitioning to physical hardware.

---

## 3. Design Philosophy

*   **Simulation First**: Validate software interfaces, ML pipelines, and data normalization before physical hardware integration.
*   **Decoupled Modularity**: Telemetry sources, brokers, database ingestion, APIs, and client UIs exist as independent services.
*   **Hardware Abstraction**: Node interactions are standardized via common JSON structures sent over MQTT topics. The subscriber backend does not distinguish between a Python virtual process, a PICSimLab simulation, or a physical ESP8266.
*   **Explainable AI (XAI)**: Prefers deterministic, clear equations for operational metric scoring over black-box ML metrics, ensuring dashboard actions are explainable to operators.
*   **Frontend/Backend Separation**: Utilizes stateless REST gateways and asynchronous event loops, keeping front-end clients independent of backend database locks.

---

## 4. Three-Phase Development Model

### Phase 1: Software Simulation (100% Completed)
*   **Virtual Nodes**: Simulates 5 regional weather monitoring nodes (Bangalore, Delhi, Hyderabad, Mumbai, Secunderabad) running as independent Python processes.
*   **OpenWeather API**: Fetches real-world meteorology data to provide baseline ambient conditions.
*   **Synthesized Metrics**: Simulates battery decay (idle discharge, heartbeat checks, data writes), RSSI signal attenuation, latency spikes, and sequence-based packet dropouts.
*   **MQTT Broker**: Connects nodes to a Mosquitto server, routing status heartbeats and telemetry data.
*   **FastAPI & React**: Exposes clean API endpoints and renders a real-time dark-mode NOC control board.

### Phase 2: PICSimLab Hardware Simulation (Pending)
*   **Virtual Board Compilation**: Python virtual nodes are replaced with simulated microcontroller boards running inside **PICSimLab**.
*   **Firmware Porting**: Embedded C/C++ scripts are flashed to simulated microchips (e.g., ESP32, PIC18F, or Arduino boards) mapping sensors to MQTT client libraries.
*   **Infrastructure Reuse**: Continues to route payloads to the same Mosquitto MQTT broker, Python backend subscriber, and React dashboard without code modifications.

### Phase 3: Real Hardware Deployment (Future)
*   **Physical Deployment**: Firmware is flashed onto physical **ESP8266** or **ESP32** microcontroller chips.
*   **Sensor Integration**: Integrates physical DHT11/BMP280 sensor shields to register ambient temperature, humidity, and barometric pressure.
*   **Field Operations**: Establishes local Wi-Fi links to publish live telemetry directly to the centralized gateway.

---

## 5. System Architecture

The architecture routes meteorological payloads and network diagnostics parameters from sensor nodes through local brokers to REST services and client dashboards.

### Architecture Layout Diagram
```text
  [ OpenWeather API ]
          │
          ▼ (diurnal baseline metrics)
  [ Virtual Sensor Nodes ]  ◄── (Simulates battery decay, RSSI noise, latency spikes, packet loss)
  (Delhi, Hyd, Mum, Blr, Sec)
          │
          ▼  MQTT Topics (wsn/{city}/data & wsn/{city}/status) over Port 1883
  [ Mosquitto Broker ]
          │
          ▼
  [ Python Subscriber Backend ]
          ├── Ingestion Subscriber  ──► [ Node CSV Files & Rotating Logs ]
          ├── Master Dataset Merger ──► [ data/processed/wsn_dataset.csv ]
          ├── Stateful Watchdog     ──► [ Check-in timers & offline flag alerts ]
          └── Fault Diagnostics     ──► [ Alert transitions logged to alerts.log ]
                  │
                  ▼
  [ Machine Learning & Analytics ]
          ├── Unsupervised Anomalies (Isolation Forest)
          ├── Environmental Predictions (Linear Regression Temp/Humidity)
          └── Network Parameters Predictions (Linear Regression vs Gradient Boosting)
                  │
                  ▼
  [ FastAPI REST Server Gateway ] ◄── (Pydantic models & dynamic CORS mappings)
          │
          ▼
  [ React WSN Control Room Dashboard ] (Mission Control NOC layout)
```

### Architectural Layer Explanations
1.  **Meteorological Seed Layer**: The nodes query the OpenWeather API dynamically on a configurable cycle, utilizing latitude and longitude constants to seed baseline ambient metrics.
2.  **Virtual Telemetry Nodes**: Combines environmental data with generated hardware constraints (battery decay based on active states, RSSI signal noise, and normal latency spikes).
3.  **Communication Layer (MQTT)**: Routes heartbeat packets over `wsn/{city}/status` and full data records over `wsn/{city}/data` via Mosquitto.
4.  **Ingestion & In-Memory Logic Layer**: Written in [`backend.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/backend.py). Implements multithreaded subscription clients, rotates logging handlers, updates real-time CSV rows, and handles node timeouts.
5.  **Analytics Layer**: Runs offline model training scripts, saving regression estimators to `models/` and anomaly audits to `data/processed/`.
6.  **REST API Layer (FastAPI)**: Serves clean Pydantic routes, handles input validations, and maps CORS headers for Vite clients.
7.  **Client Dashboard**: React SPA rendering interactive topology components, time-series graphs, and alarm registers.

---

## 6. Features Checklist

### Simulation Layer
*   [x] Multi-node virtual simulation (Delhi, Hyderabad, Mumbai, Bangalore, Secunderabad)
*   [x] OpenWeather API telemetry seeding
*   [x] MQTT publication architecture (heartbeats vs data packets)
*   [x] Packet loss simulation based on sequence tracking gaps
*   [x] Latency simulation using normal distributions and maximum limits
*   [x] Battery depletion simulation (state-based idle, heartbeat, and transmission decay)
*   [x] Battery wrap-around reset modeling (simulates manual field swaps)
*   [x] RSSI distance-attenuation simulation with Gaussian noise

### Backend & Ingestion
*   [x] Multithreaded message ingestion subscribers
*   [x] Automatic startup CSV schema migrations (migrates historical columns)
*   [x] Rotating logging handlers (`backend.log` and `alerts.log`)
*   [x] Real-time master dataset auto-merger (`wsn_dataset.csv`)
*   [x] Stateful diagnostics alarm tracker (avoids duplicate warnings)
*   [x] Watchdog timeout loops flagging node `OFFLINE` status

### Machine Learning
*   [x] Unsupervised anomaly detection (Isolation Forest contamination = 5%)
*   [x] Linear Regression Temperature forecasting model ($R^2 \approx 0.81$, MAE $\approx 0.99^\circ\text{C}$)
*   [x] Linear Regression Humidity forecasting model ($R^2 \approx 0.57$, MAE $\approx 8.03\%$)
*   [x] Network Battery decay prediction (Gradient Boosting $R^2 \approx 0.97$, MAE $\approx 2.49\%$)
*   [x] Network Packet Loss prediction (Gradient Boosting $R^2 \approx 0.75$, MAE $\approx 0.37\%$)
*   [x] Deterministic Network Health Index (NHI) scoring engine

### Frontend & UI
*   [x] Single-page React dashboard built with Tailwind CSS v4 and Recharts
*   [x] Interactive WSN SVG topology mapping live nodes and link states
*   [x] SVG dash-offset line flow animations indicating active packet streams
*   [x] Interactive tooltip hover cards detailing node metrics
*   [x] Live scrolling operations event stream sidebar
*   [x] Route code-splitting (lazy loading) and Suspense transitions
*   [x] Visited route caching mechanisms avoiding DOM redraw cycles
*   [x] Modular loading skeletons (Cards, Tables, Charts, Topologies)
*   [x] Forced 2.0-second delay spinners for settings saves and reloads

---

## 7. Machine Learning & Diagnostics Pipelines

### A. Anomaly Detection
*   **Model**: `IsolationForest` (contamination = 5%)
*   **Inputs**: `temp`, `humidity`, `pressure`, `wind_speed`
*   **Outputs**: Binary `anomaly_flag`
*   **Purpose**: Identifies structural outliers within weather telemetry logs to identify extreme weather events.

### B. Environmental Forecasting
*   **Model**: Linear Regression (`LinearRegression`)
*   **Target Variables**: Temperature ($R^2 \approx 0.81$, MAE $\approx 0.99^\circ\text{C}$) and Humidity ($R^2 \approx 0.57$, MAE $\approx 8.03\%$).
*   **Report**: Persisted inside [`reports/environmental_prediction_report.txt`](file:///d:/Projects/College/Wireless-Sensor-Network/reports/environmental_prediction_report.txt).

### C. Network Parameter Predictive Benchmarking
*   **Target Variables**: Battery level, Latency in ms, and Packet loss rates.
*   **Model Progression**: Linear Regression Baseline $\Longrightarrow$ Gradient Boosting Regressors
*   **Why Changed**: Baseline linear regressions suffered from target leakage and returned low/negative $R^2$ fit scores. Gradient Boosting Regressors utilize engineered lag features (shifted by 1), rolling means, sequence progress, and elapsed runtimes to capture non-linear trends.
*   **Performance Delta**:
    *   **Battery Decay Model**: Achieved $R^2$ of **0.9721** (MAE reduced by 90.05% down to $2.49\%$).
    *   **Packet Loss Model**: Achieved $R^2$ of **0.7519** (MAE reduced by 56.91% down to $0.37\%$).
*   **Report**: Comparative statistics are compiled inside [`reports/model_comparison_report.txt`](file:///d:/Projects/College/Wireless-Sensor-Network/reports/model_comparison_report.txt).

### D. Deterministic Network Health Index (NHI)
Machine learning models were originally trained to predict overall network health. However, this approach was **intentionally abandoned**. ML predictions of health index scores lacked explainability, fluctuated erratically, and were prone to target leakage. 

The system now implements a deterministic, explainable **Network Health Index (NHI)** score:

$$\text{NHI} = 0.35 \times S_{\text{Battery}} + 0.25 \times S_{\text{Signal}} + 0.20 \times S_{\text{Latency}} + 0.20 \times S_{\text{Loss}}$$

Where:
*   $S_{\text{Battery}} = \text{battery\_level}$
*   $S_{\text{Signal}} = \text{clamp}\left( \frac{\text{signal\_strength} - (-100.0)}{-30.0 - (-100.0)} \times 100.0,\, 0.0,\, 100.0 \right)$
*   $S_{\text{Latency}} = \text{clamp}\left( \frac{1500.0 - \text{latency\_ms}}{1500.0} \times 100.0,\, 0.0,\, 100.0 \right)$
*   $S_{\text{Loss}} = \text{clamp}\left( 100.0 - \text{packet\_loss\_rate},\, 0.0,\, 100.0 \right)$

#### NHI Ranges & Status Labels
*   `90.0 - 100.0` ➔ **EXCELLENT** (Healthy operations, green link states)
*   `75.0 - 89.9`  ➔ **GOOD** (Stable connection, minor latency)
*   `60.0 - 74.9`  ➔ **WARNING** (Degraded metrics, orange link states)
*   `40.0 - 59.9`  ➔ **CRITICAL** (Heavy packet loss, battery warnings)
*   `0.0 - 39.9`   ➔ **FAILING** (Critical node alerts, red link states)

Detailed equations and data summaries are persisted in [`reports/network_health_report.txt`](file:///d:/Projects/College/Wireless-Sensor-Network/reports/network_health_report.txt).

---

## 8. Dashboard Overview

The dashboard operates as a premium dark-mode control room. Its interface design is inspired by enterprise monitoring systems like **Grafana**, **Datadog**, and **Kibana**.

*   **Mission Control**: Operational console displaying gateway metrics, active nodes, topology maps with animated line flow offsets, and real-time alerts.
*   **Network Intelligence**: Plots geographic anomaly distributions, feature correlation matrices, and anomaly outlier audits.
*   **Predictive Analytics**: Visualizes Temperature, Humidity, Battery, Latency, and Packet Loss forecasts overlaying actual parameters.
*   **Incident Center**: Renders active alarms and historical alerts logs tables.
*   **Configuration Center**: Dynamic form to adjust intervals, discharge rates, noise ranges, and latency limits.
*   **Export Center**: Query data and download historical CSV logs.

---

## 9. Folder Structure

```text
Wireless-Sensor-Network/
├── configs/                     # Config files (settings.json parameters)
├── dashboard/                   # React frontend application
│   ├── dist/                    # Compiled production assets
│   ├── public/                  # Static assets
│   └── src/                     # React source directory
│       ├── components/          # Reusable UI components
│       │   ├── pages/           # Page views (Overview, Analytics, Predictions, etc.)
│       │   └── ui/              # Global UI elements & Skeletons.jsx
│       ├── services/            # API services (api.js methods)
│       └── App.jsx              # Main routing and dynamic lazy-loading
├── data/                        # Project storage directory
│   ├── logs/                    # Rotating log files (backend.log & alerts.log)
│   └── processed/               # Aggregated database records (wsn_dataset.csv)
├── models/                      # Pickled ML models (.pkl files)
├── plots/                       # Model evaluations comparison plots
├── predictions/                 # Exported forecasts logs
├── reports/                     # Model metrics reports and analytics summaries
├── src/                         # Backend Python scripts
│   ├── api/                     # FastAPI routing and controller logic
│   │   └── main.py              # API server entrypoint
│   ├── ml/                      # Machine learning training scripts
│   ├── backend.py               # MQTT subscriber backend and watchdog
│   └── node.py                  # WSN virtual sensor node simulator
├── main.py                      # Multi-node launch orchestrator
└── requirements.txt             # Python project dependencies
```

---

## 10. Technology Stack

*   **Backend & API**: Python, pandas, paho-mqtt, FastAPI, Uvicorn, Pydantic
*   **Communication**: MQTT (Mosquitto)
*   **Data Source**: OpenWeather API
*   **Frontend**: React, Vite, Tailwind CSS v4, Recharts, Lucide React
*   **Machine Learning**: scikit-learn, joblib, matplotlib, numpy
*   **Hardware Simulation**: PICSimLab *(Phase 2)*
*   **Future Hardware**: ESP8266 / Arduino / BMP280 sensors *(Phase 3)*

---

## 11. Local Development Setup

### A. Environment Configuration
Initialize a Python virtual environment and install the required dependencies:
```bash
# Initialize and activate Python virtual environment
python -m venv .venv
.venv\Scripts\activate # On Unix: source .venv/bin/activate
pip install -r requirements.txt
```
Configure your OpenWeather API key inside a `.env` file in the root directory:
```env
WEATHER_API_KEY=your_openweather_api_key
```

### B. Setup Mosquitto Broker
Ensure you have Mosquitto installed and running locally on port `1883`.
```bash
# Windows Mosquitto startup check command
net start mosquitto
```

### C. Launching Project Components

1.  **Start Ingestor Subscriber Backend**:
    ```bash
    python src/backend.py
    ```
2.  **Start Telemetry Nodes**:
    *   Launch all nodes concurrently:
        ```bash
        python main.py
        ```
    *   Or run a single city node manually:
        ```bash
        python src/node.py --city Delhi
        ```
3.  **Train Machine Learning Models**:
    ```bash
    # Train environmental forecasts
    python src/ml/environment_predictor.py

    # Train network parameter forecasts
    python src/ml/network_predictor_v2.py
    ```
4.  **Run FastAPI Server**:
    ```bash
    uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
    ```
5.  **Run Client Dashboard**:
    ```bash
    cd dashboard
    npm install
    npm run dev
    ```

### D. Expected URLs
*   **Vite React Client**: `http://localhost:5173`
*   **FastAPI REST Gateway**: `http://127.0.0.1:8000`
*   **FastAPI Documentation**: `http://127.0.0.1:8000/docs`

---

## 12. Local Execution Workflow
```text
[ Start MQTT Mosquitto ] ──► [ Launch subscriber backend.py ]
                                        │
                                        ├─ Check CSV Schema Migrations
                                        └─ Start Watchdog loop timers
                                        │
                                        ▼
                         [ Launch virtual main.py runner ]
                                        │
                                        ├─ Query OpenWeather values
                                        └─ Broadcast telemetry status to Broker
                                        │
                                        ▼
                       [ Retrain ml/network_predictor_v2.py ]
                                        │
                                        ▼
                        [ Launch REST api/main.py server ]
                                        │
                                        ▼
                         [ Launch Client SPA dashboard ]
```

---

## 13. Current Status

### Phase Progress
```text
Phase 1: Software Simulation Core
██████████████████████████████████████████████ 100%

Phase 2: PICSimLab Virtual Hardware Simulator
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%

Phase 3: Real ESP8266 Microchip Deployment
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%
```

---

## 14. Future Work

*   **PICSimLab Virtual Board Firmware**: Refactor Python nodes logic into C/C++ scripts for simulated microcontrollers.
*   **WebSockets Ingestion Routing**: Replace REST polling with WebSockets for real-time dashboard updates.

---

## 15. Author

**Name**: Ahana Banerjee

**University**: JNTUH

**Degree**: B.Tech + M.Tech IDP in Electronics and Communication Engineering (ECE)

---

## 16. Acknowledgements
*   Inspiration from Wireless Sensor Network protocols and industrial monitoring platforms.
*   Open-source communities powering the Mosquitto MQTT broker, FastAPI framework, scikit-learn, and React ecosystem.
