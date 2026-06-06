# Intelligent WSN Simulation: Project Context & Architecture

This document serves as the central context registry for the **Intelligent Wireless Sensor Network (WSN) Simulation** project. It details the project's goals, architecture, implementation milestones, challenges faced, and solutions designed.

---

## 1. Project Overview & Vision

This project follows a **simulation-first development approach** to build a comprehensive, intelligent, and scalable Wireless Sensor Network. Instead of immediately developing on physical hardware, we construct the complete networking, data ingestion, diagnostic monitoring, machine learning analytics, and visualization layers in software. 

### Core Design Philosophy
The primary architectural requirement is **modularity and component reuse**. The system is decoupled such that:
* **Only the sensor nodes change** as the project evolves through different deployment phases.
* The MQTT communication topics, Python backend processor, ML analytics pipelines, and frontend React dashboards remain completely unchanged.

```text
Phase 1: Python Virtual Nodes ────┐
                                   │
Phase 2: PICSimLab Hardware ───────┼─► [MQTT Broker] ─► [Python Backend] ─► [React UI]
                                   │
Phase 3: Physical ESP8266/Arduino ─┘
```

---

## 2. Layered Architecture

### A. Sensor Node Layer (Telemetry Sources)
Currently simulated via Python processes in [node.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/node.py).
* Represents a virtual sensor node deployed in a specific city (Hyderabad, Delhi, Mumbai, Bangalore, Secunderabad).
* Fetches real-world meteorological conditions using the OpenWeather API.
* Simulates physical node constraints: Gaussian noise on battery depletion, distance-based RSSI attenuation, and random network latency/loss.

### B. MQTT Communication Layer (Data Transport)
Utilizes the lightweight MQTT protocol via a local broker (Mosquitto).
* **Topics**:
  * `wsn/{city}/status` — Status heartbeats containing node operational health metrics (high frequency).
  * `wsn/{city}/data` — Sensor environment packets containing flat meteorological telemetry (low frequency).

### C. Backend Processor Layer (Data Ingestion & Diagnostics)
Implemented in [backend.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/backend.py).
* Subscribers receive and process live packets in a background thread.
* Runs a watchdog service to identify offline nodes.
* Logs raw readings to rotating text files (`backend.log`) and node-specific CSV historical files.
* Operates the rule-based Fault Detection engine.

### D. Analytics & Machine Learning Layer (Intelligence Pipeline)
Composed of offline analysis and feature enrichment scripts:
* **Fault Detection Engine**: State-tracking alarm trigger.
* **Dataset Aggregator**: Multi-source log merging.
* **Anomaly Detection Engine**: Outlier flagging using Isolation Forests.
* **Validation & EDA Engine**: Distribution plotting and stats profiling.

---

## 3. Implementation Progress & Accomplishments

We have successfully completed all Phase 1 software backend pipelines:

### Milestone 1: Physical & Network Metrics Simulation
* **Battery Discharge**: Modeled battery level starting at `100.0%`. Drains continuously due to idle state sleep, heartbeat publications, and data transmissions.
* **Battery Maintenance Wrap-around**: Programmed auto-recovery. When the battery reaches `0.0%`, it resets to `100.0%` to simulate field maintenance/replacement without crashing the simulation.
* **RSSI & Latency**: Generates realistic signal values (`-100` to `-30` dBm) with normal distribution noise and simulates packet-level latency.
* **Sequence Tracker**: Adds sequence numbers (`seq_num`) to trace message order.

### Milestone 2: Diagnostic & Aggregation Pipelines
* **Rotating Logging**: Standardized logs with Python `logging` rotating file handlers in `data/logs/backend.log`.
* **CSV Schema Migrations**: Built an auto-migrator in the backend. On startup, it inspects all historical files, appends new headers, and populates older records with default fillers to preserve datasets.
* **Log Merger**: Implemented [merge_logs.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/utils/merge_logs.py) to aggregate all separate logs into chronologically sorted datasets in `data/processed/wsn_dataset.csv`.

### Milestone 3: Fault Detection Engine
* Created [fault_detector.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/utils/fault_detector.py).
* Evaluates incoming measurements for 5 categories of faults: `OFFLINE` (heartbeat timeouts), `BATTERY` (<10% Warning, <5% Critical), `SIGNAL_STRENGTH` (< -85 dBm), `LATENCY` (>1000ms), and `PACKET_LOSS` (>5%).
* Implemented state tracking. Alarms only trigger on status transitions (preventing alert spam) and automatically emit `RESOLVED` flags when parameters stabilize. Logs structure alerts to [alerts.log](file:///d:/Projects/College/Wireless-Sensor-Network/data/logs/alerts.log).

### Milestone 4: Machine Learning & EDA
* **Unsupervised Anomaly Detection**: Integrated [anomaly_detection.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/anomaly_detection.py) using `IsolationForest` (contamination=0.05) to flags outlier observations (saved as `anomaly_flag` in dataset).
* **Exploratory Data Analysis (EDA)**: Implemented [data_analysis.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/data_analysis.py) using `matplotlib` to render distribution histograms, feature correlation matrix heatmaps, and write detailed summaries to [report.txt](file:///d:/Projects/College/Wireless-Sensor-Network/data/analysis/report.txt).

---

## 4. Technical Challenges Faced & Solutions

### Challenge 1: Historical CSV Schema Misalignment
> **Problem**: Introducing new columns (like `battery_level`, `seq_num`, `packet_loss_rate`) caused crashes and missing features in older telemetry logs.
> 
> **Solution**: Integrated a startup CSV migrator in `backend.py`. Before launching the MQTT subscription threads, it reads all historical `.csv` files, checks their headers against `STANDARD_COLUMNS`, aligns columns, and backfills empty cells with context-aware defaults (e.g. `100.0` for battery, `-60.0` for RSSI).

### Challenge 2: Battery Depletion Node Outages
> **Problem**: Initially, nodes terminated execution upon reaching `0%` battery. This resulted in historical logs becoming saturated with permanent `0.0%` battery levels (around 60% of the dataset).
> 
> **Solution**: Modified the discharge loop in `node.py` to reset the battery level to `100.0%` upon hitting `0.0%`, representing automatic maintenance. Created an update script [update_battery_history.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/utils/update_battery_history.py) that post-processed existing history logs to recalculate battery values retrospectively using the wrap-around behavior, resulting in clean, oscillating battery metrics.

### Challenge 3: Negative Packet Loss Rates
> **Problem**: Duplicate sequence numbers received during node reboots or duplicate packets caused `received_packets > expected_packets` calculations in `backend.py`, resulting in negative packet loss rates (`-100%`).
> 
> **Solution**: Updated `update_packet_loss` in `backend.py` to explicitly cap the loss rate calculations using `max(0.0, loss_pct)`. Additionally, cleaned up all existing negative telemetry points in the logs.

### Challenge 4: Seaborn Library Constraint
> **Problem**: Generating visual heatmaps of the feature correlation matrix without using the restricted `seaborn` library.
> 
> **Solution**: Built a custom heatmap using `matplotlib.pyplot.imshow` with annotated text values inside a color-mapped matrix, ensuring a premium-quality aesthetic with pure `matplotlib` tools.

---

## 5. Dataset Metrics & Insights (Current State)

* **Dataset Size**: 2,376 rows, 17 columns.
* **Missing Values**: 0 missing values across all attributes.
* **Duplicate Rows**: 0 duplicate records.
* **Anomaly Flag Rate**: Exactly 119 anomalous observations (5.01% of the dataset).
* **Battery Level**: Ranges from `0.06%` to `100.00%` with a mean of `57.64%` (0 observations showing permanent depletion).
* **Correlation Insights**:
  * Strong negative correlation between temperature and humidity (`-0.68`).
  * Moderate negative correlation between pressure and signal strength (`-0.50`).
  * Weak correlations between network latency and environmental weather values, validating decoupling of communication and physics.
