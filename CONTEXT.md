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
* **Unsupervised Anomaly Detection**: Integrated [anomaly_detection.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/anomaly_detection.py) using `IsolationForest` (contamination=0.05) to flag outlier observations (saved as `anomaly_flag` in dataset).
* **Exploratory Data Analysis (EDA)**: Implemented [data_analysis.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/data_analysis.py) using `matplotlib` to render distribution histograms, feature correlation matrix heatmaps, and write detailed summaries to [report.txt](file:///d:/Projects/College/Wireless-Sensor-Network/data/analysis/report.txt).

### Milestone 5: Backend REST API Layer (FastAPI)
* Exposed monitoring data through a clean REST API in `src/api/` using **FastAPI**, **Uvicorn**, and **Pydantic**:
  * `GET /api/health` — Gateway status and uptime verification.
  * `GET /api/nodes` — Watchdog statuses, batteries, and signal values for all regional nodes.
  * `GET /api/live-data` — Latest flat telemetry record per node city.
  * `GET /api/anomalies` — Total outliers count, ratios, and recent flagged events list.
  * `GET /api/analytics/summary` — Database averages and metric summaries over the integrated master dataset.
  * `GET /api/predictions/temperature` & `GET /api/predictions/humidity` — Forecast logs generated by regression models.
  * `GET /api/alerts` — Real-time sensor threshold incidents and alerts.
* Configured dynamic CORS mapping to permit localhost requests from Vite client origins.

### Milestone 6: React WSN Dashboard
* Built a premium, slate-950 neon-accented operational user interface under `dashboard/` using **React**, **Vite**, **Tailwind CSS v4**, and **Recharts**.
* Implemented four key operational views:
  * **Mission Control** (`mission-control` / Overview) — NOC layout containing gateway statuses, interactive topological schematic diagrams, core node health grids, live telemetry tables, and alarm listings.
  * **Network Intelligence** (`network-intelligence` / Analytics) — Plots geographical anomaly distributions and weather condition outliers via Recharts, and exposes anomaly audit logs.
  * **Predictive Analytics** (`predictive-analytics` / Predictions) — Displays Linear Regression forecast curves overlaying actual sensor temperatures/humidities alongside error metrics.
  * **Incident Center** (`incident-center` / Alerts) — Renders real-time visual system alarms and historical incident tables.

### Milestone 7: Interactive WSN Topology & Live Event Stream
* **Interactive Network Topology Panel**: Embedded an SVG network canvas inside the Mission Control page centered on the MQTT Broker:
  * Drop links are color-coded by node status: **Green** (Healthy), **Yellow** (Warning: metrics degraded), and **Red** (Fault/Offline).
  * Stable link lines display dynamic flowing CSS dash-offset animations (`flow-line-active`), while faulty links remain static red to denote connection loss.
  * Hovering over nodes renders a vector tooltip overlay showing precise real-time battery, RSSI, latency, and packet loss metrics.
* **Live Event Stream Panel**: Implemented a real-time event feed sidebar that records MQTT heartbeats, latency spikes, battery warnings, and anomaly triggers:
  * Color-codes events by severity (critical, warning, info) with custom icons and borders.
  * Automatically scrolls down to display the latest updates smoothly using React refs.

### Milestone 8: Real-time Master Dataset Merging
* Added automated merging to [backend.py](file:///d:/Projects/College/Wireless-Sensor-Network/src/backend.py).
* Upon receiving a new MQTT sensor payload, the backend automatically formats and appends the row to `wsn_dataset.csv`, ensuring the unified dataset stays synchronized in real time without needing manual aggregation scripts.

### Milestone 9: Frontend Performance Enhancement via Lazy Loading & Skeleton UI
* **Route Code-Splitting**: Migrated dashboard pages in [App.jsx](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/src/App.jsx) to dynamic imports using `React.lazy()` and wrapped them in `<Suspense>` with a pulsing `PageSkeleton`. This completely eliminated full-screen application reloaders when shifting tabs.
* **Component-Level Skeleton UI**: Built modern dashboard loading skeletons (`CardSkeleton`, `TableSkeleton`, `TopologySkeleton`, `SettingsSkeleton`, `ChartSkeleton`) to present placeholders for each data element during initialization.
* **Previously Loaded Page Caching**: Integrated a routing state tracking mechanism (`visitedPages`) so that once a page has been loaded, its DOM representation remains active and cached in memory when switching between tabs.

### Milestone 10: Operations Visual Loading Feedback
* **Forced Button Spinners**: Configured simulated 2-second UI transition timers on critical network configuration changes to show persistent spinners for operator actions.
* **Settings & Refresh Actions**: Added 2-second async timeouts to the Save Configuration, Reset Defaults, and Force Refresh actions in [Settings.jsx](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/src/components/pages/Settings.jsx) and [Alerts.jsx](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/src/components/pages/Alerts.jsx), locking button states and running loading spinners (`Loader2`, `RefreshCw`) during that duration.

### Milestone 11: Dual-Model Network Parameter Predictive Pipelines
* **Model A (Linear Regression Baseline)**: Implemented in [`network_predictor.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/network_predictor.py) as a baseline training pipeline. Uses static/raw inputs to forecast battery level, network latency, and packet loss rate. Exposes predictions and plots side-by-side performance indicators.
* **Model B (Gradient Boosting Regressor)**: Designed a high-performance ensemble forecasting pipeline in [`network_predictor_v2.py`](file:///d:/Projects/College/Wireless-Sensor-Network/src/ml/network_predictor_v2.py). Uses engineered temporal feature sets: rolling stats (5-step window means/std-devs), 1-step parameter lags, sequence progress metrics, and elapsed node running times.
* **Fit Metric Reporting**: Saves models to `models/`, prediction datasets to `predictions/network_predictions/`, and creates comparison reports benchmarked against baseline performances.

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

### Challenge 5: React Bundle Size Warnings
> **Problem**: Recharts and page sub-components bloated the initial javascript bundle size, causing Vite build warnings because chunks exceeded 500 kB.
> 
> **Solution**: Implemented dynamic code-splitting (lazy loading) inside [App.jsx](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/src/App.jsx) via `React.lazy()` to fetch page chunks asynchronously. Built a pulsing `PageSkeleton` template inside `<Suspense>` to handle transition states, successfully splitting assets into dynamic chunks (down to `6.4 kB`–`42 kB` per page). Cleaned up all unused imports and variables across views.

### Challenge 6: Cascading Renders via Synchronous useEffect setState
> **Problem**: Calling `setLoading(true)` synchronously inside the body of mounting effects (e.g. on page load inside `Alerts.jsx`) caused React to throw cascading rendering warnings, which degrades rendering performance.
> 
> **Solution**: Restructured the fetching logic: since states initialize to `loading = true` by default, mounts and polling intervals skip calling `setLoading(true)`. Created user interaction event handlers (e.g., `handleForceRefresh` mapped to `onClick`) to trigger loading screens safely outside of the render execution loop. Wrapped fetch logic in `useCallback` to enforce reference equality across renders.

### Challenge 7: Manual Data Merging Friction
> **Problem**: The ML prediction models and analytics tables read telemetry directly from the unified dataset. However, new incoming sensor metrics were only stored in node-specific files, causing analytics to stay static unless the user manually ran `merge_logs.py`.
> 
> **Solution**: Added a `save_to_processed_dataset()` subscriber callback to `backend.py` that maps, standardizes, and appends incoming payloads directly to `data/processed/wsn_dataset.csv` automatically in real time.

### Challenge 8: Tab Shifting Resets and DOM Remounting
> **Problem**: Dynamically unloading and mounting components on page switches forced Recharts and SVG topologies to recreate themselves, losing user scroll position and causing visible layout flashes on every tab click.
> 
> **Solution**: Restructured the page routing under [App.jsx](file:///d:/Projects/College/Wireless-Sensor-Network/dashboard/src/App.jsx). Rather than conditionally unmounting pages (`currentPage === name && <Component />`), we track a list of visited pages and keep them mounted but visually toggled hidden/visible using CSS layout styles, retaining in-memory caches.

### Challenge 9: Instant Backend API Responses Short-circuiting Load States
> **Problem**: Because local endpoints completed API calls in under 5ms, button transitions and save states flashed in a split second, making operations feel unstable and leaving the user unsure if they clicked.
> 
> **Solution**: Wrapped the backend update triggers in Settings and Alerts with a minimum 2-second Promise timeout. This ensures indicators like "Saving..." or "Refreshing..." remain active long enough to convey the processing state before the success notification displays.

### Challenge 10: Non-Linearity and Data Leakage in Time-Series Forecasting
> **Problem**: Baseline Linear Regression models yielded extremely poor performance (R² scores around ~0.003 for battery decay, and negative R² scores for latency forecasting). This was caused by target data leakage from using current-timestep features to predict other synchronous variables, and the models' inability to map non-linear trends (such as battery wrap-around resets or latency spike fluctuations).
> 
> **Solution**: Engineered lagged features (shifted by 1 timestep to prevent leakage), difference change rates, and rolling window standard deviations. Switched models to Gradient Boosting Regressors (`sklearn.ensemble.GradientBoostingRegressor`) and replaced random train-test splitting with a strict chronological (non-shuffled) chronological split (80% train, 20% test). This resolved leakage, yielding high R² accuracy scores (>0.90 for battery).

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

