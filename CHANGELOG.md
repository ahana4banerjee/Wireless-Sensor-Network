# Changelog

All notable changes to the Intelligent Wireless Sensor Network (WSN) Platform will be documented in this file.

## [2.1.0] - 2026-06-28
### Added
- **Operational Decision Support System (ODSS)**: Evolved model predictions into 72-hour forecasting timelines (Temperature, Humidity, Pressure, Weather Condition, Battery Level, RSSI, Latency, Packet Loss, Health Score).
- **Deterministic Explainable Directives**: Auto-generated rules-based alerts (battery maintenance check within $X$ hours, antenna realignment warnings, rain visibility compensation).
- **Confidence Prediction Intervals**: Margin of error intervals (1.96 × RMSE) derived dynamically from the validation registry logs.
- **Node Risk Classification**: Badged node risk levels (`NORMAL` to `CRITICAL`) using thresholds for each forecast step.
- **Collapsible ML Evaluation**: Collapsible secondary view displaying historical actual-versus-predicted regression graphs and validation benchmarks.

### Fixed
- **Linear Regression Flatline**: Discovered and resolved OLS underflow issues by removing monotonically growing raw `unix_ts` features from regression training models, returning dynamic cyclical predictions.
- **Model Output Filename Duplication**: Refactored the retraining pipeline in `training_manager.py` to write directly to clean unversioned filenames (`f"{key}.pkl"` and prediction CSVs) to prevent generating duplicate versioned output files on disk.

## [2.0.0] - 2026-06-27
### Added
- **Phase 2 Virtual Hardware Integration**: Embedded C++ firmware compilable for simulated ESP32 boards inside the Wokwi editor workspace.
- **Dynamic Node Registry**: Hardware eFuse MAC station identification mapping to geographical city coordinates dynamically.
- **Digital Twin Shared Store**: Persisted inter-process JSON state snapshots with atomic temp-file swaps for thread-safety.
- **Continuous Learning Daemon**: Background retraining trigger scheduler observing row accumulations and cooldown timers.
- **ML Operations Dashboard**: Frontend panels logging active champion model validation scores ($R^2$, MAE, RMSE).

## [1.0.0] - 2026-06-20
### Added
- **Phase 1 Software Simulation**: Decoupled Python node simulators publishing meteorology telemetry seeded from the OpenWeather API.
- **MQTT Message Routing**: Telemetry updates routed via local Mosquitto client brokers.
- **Stateless Replay Demo Mode**: Cycle-modulo time clock replayer serving mock offline data for standalone portfolio hosts.
- **NOC Control Room Dashboard**: Dark-theme SPA mapping regional nodes and link topologies.
