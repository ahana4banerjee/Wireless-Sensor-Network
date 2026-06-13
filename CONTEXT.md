# Intelligent WSN Simulation: Technical Registry & Architecture Context

This document serves as the **single source of truth** and technical registry for the **Intelligent Wireless Sensor Network (WSN) Simulation** platform. It provides comprehensive details on the project's motivation, design decisions, architectural blueprints, ML models, and operational setups. It is designed to fully onboard a new developer to the project without requiring external clarification.

---

## 1. Project Overview

### Full Project Title
**Intelligent Wireless Sensor Network (WSN) Platform & Simulation**

### Motivation
Deploying and debugging physical Wireless Sensor Networks (WSNs) is notoriously difficult. Developers face a complex web of hardware failures, power constraints, environmental noise, and RF propagation limitations (such as distance-based signal attenuation). Debugging these issues directly on embedded bare-metal microcontrollers (e.g., ESP8266 or Arduino boards) is slow and highly prone to developer friction. 

This platform addresses these challenges by implementing a **simulation-first development approach**. By modeling the physical and network behaviors entirely in software, we can validate ingestion databases, rule-based alarm engines, machine learning predictors, and visualization dashboards prior to flashing a single byte of firmware onto a physical microchip.

### Objectives
*   **Decoupled Modularity**: Maintain a strictly decoupled architecture where layers (communication, database, machine learning, REST API, client dashboard) remain identical, and only the telemetry source (sensor nodes) changes as the project scales.
*   **Predictive Maintenance**: Integrate predictive machine learning models to forecast sensor battery failures, network packet dropouts, and latency anomalies.
*   **NOC Diagnostics**: Deliver an enterprise-grade Network Operations Center (NOC) dashboard providing clear state visualization, SVG network topology flowlines, and interactive real-time telemetry diagnostics.

### Real-World Applications
*   **Smart City Environmental Monitoring**: Multi-city localized weather tracking grids mapping meteorological changes in real time.
*   **Agricultural Sensor Arrays**: Ambient humidity, temperature, and pressure tracking across large-scale farm grids.
*   **Industrial In-Plant Diagnostics**: Real-time asset safety monitoring, packet-loss tracking, and battery maintenance prediction inside factory structures.

### Design Philosophy
The system follows a strict **modularity-first** philosophy. The MQTT topic structure, database schema, data processing pipelines, REST APIs, and client dashboards are hardware-agnostic. 

```text
               ┌─────────────────────────────────────────────────────────┐
               │              Telemetry Sources (Sensor Nodes)           │
               └───────────────────────────┬─────────────────────────────┘
                                           │
          ┌────────────────────────────────┼──────────────────────────────┐
          │                                │                              │
          ▼ (Phase 1)                      ▼ (Phase 2)                    ▼ (Phase 3)
   [ Python Nodes ]                [ PICSimLab Boards ]            [ ESP8266 Hardware ]
          │                                │                              │
          └────────────────────────────────┼──────────────────────────────┘
                                           │
                                           ▼ (MQTT Topics)
                             ┌───────────────────────────┐
                             │       MQTT Broker         │
                             └─────────────┬─────────────┘
                                           │
                                           ▼
                             ┌───────────────────────────┐
                             │   Python Ingestion Eng.   │
                             └─────────────┬─────────────┘
                                           │
                                           ▼
                             ┌───────────────────────────┐
                             │    React NOC Dashboard    │
                             └───────────────────────────┘
```

---

## 2. Three-Phase Development Roadmap

### Phase 1: Software Simulation Platform (Current)
In this initial phase, the entire platform is constructed using Python-based virtual sensor nodes.
*   **Multi-Node Simulation**: Simultaneously simulates five regional nodes deployed in Bangalore, Delhi, Hyderabad, Mumbai, and Secunderabad.
*   **Meteorological Telemetry**: Integrates with the OpenWeather API to seed nodes with real-world, diurnal weather conditions.
*   **Synthetic Physical Behavior**: Adds mathematical models for battery decay (based on transmission costs), Gaussian RSSI signal attenuation, and normal-distribution latency spikes.
*   **MQTT Architecture**: Employs local Mosquitto brokers to transmit status heartbeats and environmental payloads over wildcard paths.
*   **Ingestion & Watchdog Backend**: Runs multithreaded subscription scripts writing log files, real-time master datasets, and evaluating node health.
*   **FastAPI & React Dashboard**: Serves REST gateways and visualizes the network layout with dynamic layout animations.

### Phase 2: PICSimLab Hardware Simulation
Migrate the software virtual nodes to hardware simulation without altering the rest of the application layers.
*   The virtual Python nodes are retired.
*   Firmware written in C/C++ is flashed onto simulated microcontrollers (e.g., PIC18F, ESP32, or Arduino boards) inside the **PICSimLab** emulator.
*   The simulated boards interact with the local MQTT broker, transmitting equivalent JSON structures on the same communication topics.

### Phase 3: Real Hardware Implementation
Deploy the validated architecture onto physical hardware nodes in the field.
*   Microcontrollers like the **ESP8266** or **ESP32** are loaded with the validated firmware.
*   Hardware sensors (such as DHT11 temperature/humidity sensors or BMP280 pressure shields) are wired to the microchips.
*   The nodes establish Wi-Fi links, publishing live telemetry packets to the centralized MQTT broker. The REST API and frontend dashboard run without a single modification.

---

## 3. Current System Architecture

The current architecture routes live atmospheric data and network quality metrics from virtual nodes to a web-based NOC monitoring client.

### Architectural Flow Diagram
```text
  [ OpenWeather API ]
          │
          ▼ (diurnal ambient baselines)
  [ Virtual Sensor Nodes ]  ◄── (Simulates battery depletion, RSSI noise, latency, packet loss)
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

### Layer-by-Layer Walkthrough
1.  **Meteorological Seed Layer**: The nodes call the OpenWeather API on a configurable cycle, utilizing actual geographical coordinates to fetch live values for temperature, humidity, pressure, wind velocity, and visibility.
2.  **Virtual Telemetry Nodes**: Modeled in [`node.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/node.py). Combines weather data with generated hardware constraints (battery decay, distance-based RSSI attenuation, packet transmission delays, and packet loss).
3.  **Communication Layer (MQTT)**: Lightweight broker endpoints handle messages asynchronously.Wildcard topics isolate high-frequency heartbeats from low-frequency weather reports.
4.  **Ingestion & In-Memory Logic Layer**: Written in [`backend.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/backend.py). Operates multithreaded loops to store incoming records, run CSV checks, compute network packet loss rates from sequence gaps, and monitor node timeout states.
5.  **Analytics Layer**: Runs offline model training scripts, persisting regression estimators to `models/`, anomalies audits to `data/processed/`, and visual summaries to reports.
6.  **REST API Layer**: Runs a FastAPI application exposing endpoint APIs. Formulates data via Pydantic model schemas and supports CORS mappings for local dashboard clients.
7.  **Client Dashboard**: A responsive React dark-mode portal displaying system metrics, network topology lines, and active alarms.

---

## 4. Folder Structure

```text
Wireless-Sensor-Network/
├── configs/                     # System-wide configuration files
│   └── settings.json            # Dynamic simulation parameters synced via API
├── dashboard/                   # React frontend application
│   ├── dist/                    # Compiled production assets
│   ├── public/                  # Static assets (icons, SVGs)
│   ├── src/                     # React source directory
│   │   ├── components/          # Reusable UI components
│   │   │   ├── pages/           # Page views (Overview, Analytics, Predictions, etc.)
│   │   │   └── ui/              # Global UI elements & Skeletons.jsx
│   │   ├── services/            # API integration calls (api.js)
│   │   ├── App.jsx              # Routing configurations and lazy-loading
│   │   └── index.css            # Tailwind CSS style sheets
│   └── vite.config.js           # Vite build parameters
├── data/                        # Project storage directory
│   ├── EDA/                     # Visual plots generated by ML scripts
│   ├── logs/                    # Rotating log files
│   │   ├── backend.log          # System records and node payloads
│   │   └── alerts.log           # Logged diagnostic alarm states
│   └── processed/               # Aggregated database records
│       └── wsn_dataset.csv      # Real-time master dataset
├── models/                      # Pickled ML models (Regression & Isolation Forest)
├── plots/                       # Feature performance plots
├── predictions/                 # Exported prediction logs
├── reports/                     # Model metrics reports and analytics summaries
├── src/                         # Backend Python scripts
│   ├── api/                     # FastAPI routing and controller logic
│   │   └── main.py              # API server entrypoint
│   ├── ml/                      # Machine learning training scripts
│   │   ├── anomaly_detection.py # Isolation Forest detection model
│   │   ├── data_analysis.py     # Custom Matplotlib EDA rendering script
│   │   ├── environment_predictor.py # Ambient Temperature/Humidity regression
│   │   ├── network_health.py    # Deterministic NHI scoring calculator
│   │   ├── network_predictor.py # Baseline network regression model
│   │   └── network_predictor_v2.py # Gradient Boosting parameter model
│   ├── backend.py               # MQTT subscriber backend and watchdog
│   └── node.py                  # WSN virtual sensor node simulator
├── main.py                      # Multi-node launch orchestrator
├── requirements.txt             # Python project dependencies
└── CONTEXT.md                   # Single source of truth (this document)
```

---

## 5. Node Simulation

The virtual node simulation runs inside [`node.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/node.py). It models the behavior of physical nodes deployed under harsh outdoor environments.

### Sensor Node Lifecycle
1.  **Boot Phase**: Instantiated with command flags (e.g. `--city Delhi`). Loads its localized configuration and initializes state variables: sequence counter = `0`, battery level = `100.0%`, status = `ONLINE`.
2.  **Connection Phase**: Establishes a TCP connection to the Mosquitto broker on `127.0.0.1:1883`.
3.  **Active Execution Phase**: Launches parallel timer tasks:
    *   **Heartbeat Loop (High Frequency)**: Every 20 seconds (configurable), publishes a lightweight status packet to `wsn/{city}/status`.
    *   **Data Loop (Low Frequency)**: Every 60 seconds, fetches meteorological telemetry from OpenWeather, calculates battery decay and signal quality, and publishes a full record payload to `wsn/{city}/data`.
4.  **Depletion & Maintenance Wrap-around**: If battery level reaches `0.0%`, the node changes to `OFFLINE` status. It triggers an automatic recovery reset back to `100.0%` on the next interval, simulating field technicians replacing the batteries.

### Simulated Parameters
*   **Packet Loss Simulation**: Nodes track sequence numbers (`seq_num`). A random generator drops packets based on the `packet_loss_rate` parameter (e.g., `0.05` for 5% loss rate). The backend determines loss gaps via:
    $$\text{Lost Packets} = \text{Current Seq} - \text{Previous Seq} - 1$$
*   **Latency Simulation**: Latency is computed using a normal distribution:
    $$\text{latency\_ms} = \mu + \sigma \times \mathcal{N}(0, 1)$$
    Spikes are constrained by the dynamic `max_delay_ms` simulation configuration setting.
*   **Battery Depletion Simulation**: Battery drain is state-dependent:
    $$\text{Drain} = \text{idle\_discharge} + \text{heartbeat\_cost} + \text{data\_payload\_cost}$$
    Discharge weights are read from the global `settings.json` parameters.
*   **RSSI (Signal Strength) Simulation**: RSSI decreases with distance from the gateway:
    $$\text{RSSI} = \text{rssi\_baseline} + \text{Gaussian Noise} - \alpha \times \text{distance}$$
    Normal fluctuations are modeled using a Gaussian noise standard deviation of 3.0 dB.

### MQTT Payload Schema Examples

#### Heartbeat Packet (`wsn/Delhi/status`)
```json
{
  "unix_ts": 1781285040,
  "node_id": "Delhi",
  "battery_level": 98.4,
  "seq_num": 12,
  "signal_strength": -58.2
}
```

#### Data Telemetry Packet (`wsn/Delhi/data`)
```json
{
  "timestamp": "2026-06-13 22:30:15",
  "unix_ts": 1781285040,
  "node_id": "Delhi",
  "condition": "Clouds",
  "temp": 34.5,
  "humidity": 45.0,
  "pressure": 1008,
  "wind_speed": 4.1,
  "visibility": 10000,
  "battery_level": 98.4,
  "signal_strength": -58.2,
  "latency_ms": 142,
  "packet_loss_rate": 2.1,
  "seq_num": 12,
  "city": "Delhi"
}
```

---

## 6. Backend Processing

The central orchestration logic is written in [`backend.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/backend.py). It manages data ingestion, persistence, and state tracking.

### Ingestion Subscriber
The backend runs a multithreaded `paho-mqtt` subscriber client listening to the broker on wildcards:
*   `wsn/+/data` ➔ Routes telemetry records to database folders.
*   `wsn/+/status` ➔ Routes status heartbeats to the active watchdog registry.

### CSV Logging & Auto-migration
Data is stored locally in individual node files (`data/{city}_history.csv`). To prevent application crashes when updating parameters (like adding `battery_level` or `packet_loss_rate`), the backend runs a **startup schema migrator**:
1.  Loads all historical CSV files on boot.
2.  Compares headers against `STANDARD_COLUMNS`.
3.  On discrepancy, appends missing columns and populates rows with default fillers (e.g. `100.0` for battery, `-60.0` for RSSI).

### Real-Time Master Dataset Generation
To support real-time machine learning inference, the backend automatically merges new telemetry payloads into the central processed dataset (`data/processed/wsn_dataset.csv`), bypassing the need to run manual processing scripts.

### Stateful Fault Diagnostics
Evaluates incoming payloads against operational limits:
*   `BATTERY`: Warning flag triggered if $< 10.0\%$, Critical flag if $< 5.0\%$.
*   `SIGNAL`: Alert triggered if RSSI signal strength drops below $-85.0$ dBm.
*   `LATENCY`: Triggered if transit delay exceeds $1000$ ms.
*   `PACKET_LOSS`: Triggered if calculated packet dropout rates exceed $5.0\%$.

To prevent duplicate logs, the system tracks alarm states. Warnings are only appended to `data/logs/alerts.log` when a state change occurs. A `RESOLVED` flag is generated once parameter levels return to standard bounds.

### Node Health Watchdog
A background thread runs a watchdog loop. If a node fails to check in with a status heartbeat for longer than:
$$\text{Timeout Threshold} = \text{heartbeat\_interval} \times 3$$
The watchdog marks the node's status as `OFFLINE` and appends a critical outage alert to the logs.

---

## 7. Dataset Specification

The master processed database (`wsn_dataset.csv`) contains the following columns:

| Column Name | Data Type | Range / Unit | Diagnostic Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| `timestamp` | String | YYYY-MM-DD HH:MM:SS | Human-readable audit tracking of observation captures. |
| `unix_ts` | Integer | Epoch seconds | Used for chronological sorting, time deltas, lag calculations, and ML model inputs. |
| `node_id` | Categorical | City Name | Identifies the physical/virtual node origin, grouping database queries. |
| `condition` | Categorical | Clouds, Rain, Mist, Clear, etc. | Weather baseline text label from the OpenWeather payload. |
| `temp` | Float | ${^\circ}\text{C}$ (e.g. $-10.0$ to $50.0$) | Atmospheric temperature. Key feature for forecasting and anomaly detection. |
| `humidity` | Float | $0.0\%$ to $100.0\%$ | Relative humidity. Key predictor for forecasting models. |
| `pressure` | Float | hPa (e.g. $980$ to $1030$) | Barometric pressure. Diagnostic baseline indicator for seasonal shifts. |
| `wind_speed` | Float | m/s | Ambient wind speed. Features in weather forecasting regression models. |
| `visibility` | Float | Meters (e.g. $0$ to $10000$) | Visual distance range. Diagnostic feature for outlier analysis. |
| `battery_level` | Float | $0.0\%$ to $100.0\%$ | Remaining node capacity. Tracks energy discharge rates. |
| `signal_strength` | Float | dBm (RSSI: $-100.0$ to $-30.0$) | Signal quality. Predicts network packet losses. |
| `latency_ms` | Float | Milliseconds ($0.0$ to $10000.0$) | Transit delay times. Tracks network congestion and node response times. |
| `packet_loss_rate`| Float | $0.0\%$ to $100.0\%$ | Computed packet drop rate. Evaluates routing path degradation. |
| `seq_num` | Integer | Sequence number | Incremental package counter, used to identify missing packets. |
| `city` | Categorical | City Name | Redundant city label for API integration support. |
| `anomaly_flag` | Binary | `0` (Normal) or `1` (Anomaly) | Unsupervised isolation outlier flag added by the machine learning pipeline. |
| `network_health_score` | Float | $0.0$ to $100.0$ | Computed deterministic score of the network's health. |

---

## 8. Machine Learning Layer

The WSN analytics layer integrates four model pipelines:

```text
                                  ┌───────────────────────────┐
                                  │   Processed Dataset CSV   │
                                  └─────────────┬─────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         │                                      │                                      │
         ▼                                      ▼                                      ▼
┌─────────────────┐                    ┌──────────────────┐                   ┌──────────────────┐
│ Anomaly Detect. │                    │ Env. Predictions │                   │ Net. Predictions │
│(Isolation Forest)                    │(Linear Regress.) │                   │(Gradient Boost.) │
└────────┬────────┘                    └────────┬─────────┘                   └────────┬─────────┘
         │                                      │                                      │
         ├─ Contamination: 5%                   ├─ Target: Temperature                 ├─ Target: Battery (R²=0.97)
         └─ Output: anomaly_flag                │  (MAE = 0.99°C, R²=0.81)             ├─ Target: Loss (R²=0.75)
                                                └─ Target: Humidity                    └─ Target: Latency
                                                   (MAE = 8.03%, R²=0.57)
```

### Anomaly Detection
*   **Module**: [`anomaly_detection.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/anomaly_detection.py)
*   **Model**: Scikit-Learn `IsolationForest`
*   **Why Chosen**: Unsupervised isolation forests are highly effective at identifying multi-dimensional outliers in time-series data without requiring labeled datasets.
*   **Inputs**: `temp`, `humidity`, `pressure`, `wind_speed`.
*   **Outputs**: `anomaly_flag` (saves outliers as `1` in the database). Contamination is set to exactly `0.05` (5% expected anomalies).

### Environmental Prediction
*   **Module**: [`environment_predictor.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/environment_predictor.py)
*   **Model**: Linear Regression (`LinearRegression`)
*   **Performance Benchmarks**:
    *   **Temperature Predictor**: Features used: `unix_ts`, `pressure`, `wind_speed`, `humidity`, `hour`, `day`, `month`. MAE: **$0.99^\circ\text{C}$**, $R^2$: **0.8095**.
    *   **Humidity Predictor**: Features used: `unix_ts`, `pressure`, `wind_speed`, `temp`, `hour`, `day`, `month`. MAE: **$8.03\%$**, $R^2$: **0.5709**.
*   **Output**: Pickled model objects saved to `models/` directory for API use.

### Network Prediction
*   **Baseline Model**: [`network_predictor.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/network_predictor.py) utilizing simple Linear Regression. Since it attempted to predict battery or packet loss using static synchronous parameters directly, it suffered from target leakage and returned very poor fit scores ($R^2 \approx 0.003$ for battery, and negative $R^2$ for latency).
*   **Engineered Model (V2)**: [`network_predictor_v2.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/network_predictor_v2.py) utilizing a Gradient Boosting Regressor (`sklearn.ensemble.GradientBoostingRegressor`).
*   **Feature Engineering**: Added lagged values (shifted by 1 timestep to prevent leakage), temporal diff rates, elapsed runtime tracker, sequence progress, and 5-step rolling window averages and standard deviations. 
*   **Performance Benchmarks**:
    *   **Battery Decay Model**: Achieves an $R^2$ of **0.9721** (MAE: 2.49%). Captures non-linear wrap-around reset discharge curves.
    *   **Packet Loss Model**: Achieves an $R^2$ of **0.7519** (MAE: 0.37%).
    *   **Latency Model**: Resolves latency jitter using rolling window statistics.
*   **Training splitting**: Uses strict chronological sorting and non-shuffled splits (80% train, 20% test) to prevent future data leakage.

### Network Health Index (NHI)
Machine learning models were originally trained to predict overall network health. However, this approach was **intentionally abandoned**. ML predictions of health index scores lacked explainability, fluctuated erratically, and were prone to target leakage. For operational NOC centers, operators require deterministic, explainable metrics to make maintenance decisions.

We replaced the ML health score with a deterministic **Network Health Index (NHI)** score.

#### Formula Formulation
$$\text{NHI} = 0.35 \times S_{\text{Battery}} + 0.25 \times S_{\text{Signal}} + 0.20 \times S_{\text{Latency}} + 0.20 \times S_{\text{Loss}}$$

Where:
*   $S_{\text{Battery}} = \text{battery\_level}$ (directly mapped, $0$ to $100$)
*   $S_{\text{Signal}} = \text{clamp}\left( \frac{\text{signal\_strength} - (-100.0)}{-30.0 - (-100.0)} \times 100.0,\, 0.0,\, 100.0 \right)$
*   $S_{\text{Latency}} = \text{clamp}\left( \frac{1500.0 - \text{latency\_ms}}{1500.0} \times 100.0,\, 0.0,\, 100.0 \right)$
*   $S_{\text{Loss}} = \text{clamp}\left( 100.0 - \text{packet\_loss\_rate},\, 0.0,\, 100.0 \right)$

#### NHI Ranges & Status Labels
*   `90.0 - 100.0` ➔ **EXCELLENT** (Healthy operations, green link states)
*   `75.0 - 89.9`  ➔ **GOOD** (Stable connection, minor latency)
*   `60.0 - 74.9`  ➔ **WARNING** (Degraded metrics, orange link states)
*   `40.0 - 59.9`  ➔ **CRITICAL** (Heavy packet loss, battery warnings)
*   `0.0 - 39.9`   ➔ **FAILING** (Critical node alerts, red link states)

---

## 9. FastAPI Backend REST API

The FastAPI service runs in [`src/api/main.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/api/main.py) and serves data to the frontend React dashboard.

### API Endpoint Registry

*   `GET /api/health`
    *   *Purpose*: Verifies gateway status and calculates server uptime.
    *   *Response*: JSON confirmation with status message and timestamps.
*   `GET /api/nodes`
    *   *Purpose*: Returns watchdog statuses (ONLINE/OFFLINE), RSSI, batteries, and last checked times.
    *   *Response*: An array of active node profiles.
*   `GET /api/live-data`
    *   *Purpose*: Returns the latest environmental telemetry entry for each city.
    *   *Response*: Array of flat weather and network status data.
*   `GET /api/anomalies`
    *   *Purpose*: Returns total outlier counts, ratio percentages, and recent flagged event logs.
    *   *Response*: Detailed metrics and a list of anomalous entries.
*   `GET /api/analytics/summary`
    *   *Purpose*: Computes system-wide averages (average temp, latency, and packet loss) over the master dataset.
    *   *Response*: Normalized averages for reporting.
*   `GET /api/predictions/temperature` & `GET /api/predictions/humidity`
    *   *Purpose*: Retreives weather forecast data for temperature and humidity.
    *   *Response*: Array of actual vs. predicted values.
*   `GET /api/predictions/network`
    *   *Purpose*: Exposes baseline and Gradient Boosting prediction metrics for battery, latency, and packet loss.
    *   *Response*: Chronological array of predictions vs. actuals.
*   `GET /api/alerts`
    *   *Purpose*: Retreives real-time state alerts and historical alerts logged by the diagnostic engine.
    *   *Response*: Array of diagnostic notifications.
*   `GET /api/system-score`
    *   *Purpose*: Computes the overall Network Health Index (NHI) status score for the WSN.
    *   *Response*: System average score and status classifications.
*   `GET /api/settings` & `POST /api/settings`
    *   *Purpose*: Reads or updates active simulation parameters (intervals, battery consumption costs, packet loss rates) and saves them to `configs/settings.json`.
    *   *Response*: Confirmation of settings status.

---

## 10. React Dashboard

The frontend client is a web-based dashboard built with React and Tailwind CSS.

### Routing & Navigation
We avoid global application loading screens. If a user accesses a specific tab, only that page is loaded, using **Page-Wise Lazy Loading** via `React.lazy()` and `<Suspense>` inside [`App.jsx`](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/src/App.jsx). 

To prevent visual re-render latency and retain active Recharts layout states, the dashboard caches previously opened views. Visited pages are hidden using CSS style tags rather than fully unmounted.

### Dashboard Pages
*   **Mission Control (Overview)**: Central monitoring board. Displays gateway statuses, active topological SVG node nodes maps, live event feeds, and metrics grids.
*   **Network Intelligence (Analytics)**: Renders ML anomaly plots, geographic correlation tables, and outlier audits.
*   **Predictive Analytics (Predictions)**: Renders weather forecasts and network parameter prediction lines.
*   **Incident Center (Alerts)**: Displays active alarms and historical alerts tables.
*   **Configuration Center (Settings)**: Settings form containing slider controls to adjust node parameters.
*   **Export Center (Export)**: Query data and download historical CSV files.

### Visual Loading Feedback
*   **Modular Loading Skeletons**: Displays skeleton loaders (`CardSkeleton`, `TableSkeleton`, `TopologySkeleton`, `SettingsSkeleton`, `ChartSkeleton`) while data fetches.
*   **Action Spinners & Timers**: Save configuration, reset defaults, and force refresh actions trigger a minimum 2-second Promise timeout to display spinning icons (`Loader2` or `RefreshCw`), preventing layout flashing.

---

## 11. UI/UX Philosophy

Our layout styling draws inspiration from enterprise monitoring tools like **Grafana**, **Datadog**, and **Kibana**, as well as classic physical **Network Operations Center (NOC)** dashboards.

We intentionally avoided generic "AI agency templates" characterized by flat soft-glow gradients and floating cards without grid boundaries. Instead, we implemented a structured design system:
*   **Color Palette**: A slate-950 background with dark slate cards and solid border lines, accented with neon statuses (emerald-500, amber-500, rose-500, violet-600).
*   **Aesthetics**: Features clear layouts, sharp typography, structured borders, and animated path flowlines (`flow-line-active` dash-offsets) to convey real-world operations.

---

## 12. Major Engineering Decisions

*   **React over Streamlit**: While Streamlit is useful for basic ML mockups, it requires complete page reloads on every user interaction. React enables high-frequency topological re-renders, SVG DOM interactions, custom tab state caching, and live scrolling feeds without server execution bottlenecks.
*   **FastAPI**: Provides native async loops, Pydantic data schemas, automatic OpenAPI docs, and CORS middleware configurations suited for Vite client integrations.
*   **MQTT**: Ultra-lightweight publish-subscribe protocol suited for low-bandwidth networks.
*   **OpenWeather API**: Used to seed simulated environments with real-world weather telemetry data.
*   **Gradient Boosting Regressors**: Solves time-series target data leakage via lag engineering, out-performing linear models when predicting battery decay and packet loss.
*   **Deterministic Network Health Index**: Handled via explainable engineering scoring to provide consistent metrics to operators, resolving explainability issues with ML-based indicators.
*   **Three-Phase Architecture**: Validating software pipelines first minimizes bare-metal debugging overhead.

---

## 13. Current Project Status

- [x] Phase 1 Simulation Core Telemetry
- [x] Multithreaded Ingestor Backend
- [x] Automated CSV Schema Migrations
- [x] Rotating File Logging (backend.log & alerts.log)
- [x] Stateful Fault Diagnostics Alarm Tracking
- [x] Anomaly Outlier Detection (Isolation Forest)
- [x] Environmental Predictions (Linear Regression temperature/humidity)
- [x] Network Parameters Predictions (Linear Regression Baseline)
- [x] Network Parameters Predictions (Gradient Boosting Regressors V2)
- [x] Real-time Master CSV Dataset Merging
- [x] FastAPI REST Server Gateway Routing
- [x] React Client Dashboard Layout
- [x] Dynamic Route Code-Splitting & Lazy Loading
- [x] Visited Page Caching Mechanics
- [x] Custom Loading Skeleton UI Templates
- [x] Forced Action Spinner Timers
- [ ] Phase 2 PICSimLab Microcontroller Hardware Simulation
- [ ] Phase 3 ESP8266/Arduino Physical Node Implementation

---

## 14. Future Roadmap

### Phase 1 Wrap-up
*   Scale up dataset records and continue validation testing.
*   Add more diagnostic parameters if needed.

### Phase 2 Implementation
*   Refactor Python nodes logic into C/C++ code.
*   Configure **PICSimLab** simulators with virtual boards, mapping serial writes to Mosquitto broker targets.

### Phase 3 Implementation
*   Deploy firmware to physical **ESP8266** microcontrollers.
*   Connect physical sensors (DHT11, BMP280) and run network field tests.

---

## 15. Development Guidelines

### Modular Separation
Do not couple API endpoints to specific hardware definitions. The API reads data from CSV databases; whether these files are populated by virtual Python nodes, PICSimLab simulations, or physical microcontrollers does not matter.

### API Schema Stability
Any modification to FastAPI paths must maintain backward compatibility with the frontend React routing and state formats.

### Retraining Independence
Machine learning models are trained asynchronously. Retraining scripts must remain separated from the main subscriber execution loops to avoid performance bottlenecks.

### Hardware Abstraction
Ensure that any new telemetry feature matches standard JSON schemas so that firmware changes do not break backend database structures.

---

## 16. How To Run The Project

### 1. Environment Set Up
Ensure you have Python 3.10+ and Node.js 18+ installed on your local system.
```bash
# Setup Python virtual environment
python -m venv .venv
.venv\Scripts\activate # On Unix: source .venv/bin/activate
pip install -r requirements.txt

# Create .env config in root directory
echo WEATHER_API_KEY=your_key_here > .env
```

### 2. Start MQTT Broker
Launch your local Mosquitto broker instance. Ensure it is listening on port `1883`.

### 3. Launch Backend Subscriber
```bash
python src/backend.py
```
*(Handles migrations, real-time merging, and node timeout watchdogs)*

### 4. Start Virtual Sensors
```bash
python main.py
```
*(Starts Delhi, Mumbai, Bangalore, Hyderabad, and Secunderabad virtual nodes concurrently)*

### 5. Train Machine Learning Models
```bash
# Retrain weather predictions
python src/ml/environment_predictor.py

# Retrain network parameters predictors
python src/ml/network_predictor_v2.py
```

### 6. Run FastAPI Server
```bash
uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

### 7. Run Client Dashboard
```bash
cd dashboard
npm install
npm run dev
```
Open your web browser and navigate to the local hosting url (usually `http://localhost:5173`).

---

## 17. Known Limitations

*   **Experimental Latency Prediction**: Latency measurements fluctuate due to random network jitter, resulting in higher prediction errors than other variables.
*   **Synthetic Network Parameters**: Latency, RSSI, and packet loss rates are synthetically generated to supplement real meteorological data.
*   **PICSimLab & Hardware Integrations**: Simulated and physical hardware integrations are pending Phase 2 and Phase 3 development.

---

## 18. Contributor Notes

### Extending Node Counts
To add a new city node:
1.  Open `main.py` and register the new city with its latitude and longitude.
2.  The subscriber backend automatically detects the new node ID over MQTT, creates the city's CSV history database, and updates the watchdog tracker.
3.  Add coordinates inside the frontend SVG topology code block to render the link lines on the Mission Control layout.

### Adjusting Diagnostic Ranges
To adjust threshold limits for alerts (e.g. changing RSSI alert triggers from $-85$ dBm to $-90$ dBm), modify the limit variables inside the `validate_metrics` loop in `backend.py`.
