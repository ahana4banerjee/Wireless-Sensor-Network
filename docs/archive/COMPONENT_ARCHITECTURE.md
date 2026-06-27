# Component Architecture & Frontend Component Tree

The WSN client dashboard is constructed using modular, reusable React functional components. Below is the updated structural layout of pages, subcomponents, and layout modules.

```text
dashboard/src/components/
├── pages/
│   ├── Overview.jsx (Mission Control Console)
│   │   ├── Executive Stats Grid (Gateway status, database sizes, online ratios)
│   │   ├── SVG Network Topology (Link animations, active node statuses, coordinate pathways)
│   │   │   └── Node Tooltip Overlay (Hover diagnostics metrics)
│   │   ├── Health Overview Grid (Physical metrics progress bars, average summaries)
│   │   └── Live Event Stream (Auto-scrolling feed tracking status notifications)
│   │
│   ├── Analytics.jsx (Network Intelligence Page)
│   │   ├── Anomaly Density Charts (Recharts outlier maps)
│   │   ├── Correlation Matrices (Weather vs network performance distributions)
│   │   └── Outliers Audit Log (Tabular anomaly event tables)
│   │
│   ├── Predictions.jsx (Predictive Analytics Page)
│   │   ├── Weather Forecasting charts (diurnal Temperature/Humidity regression curves)
│   │   ├── Network Parameter Predictions (actual vs predicted lines for Battery/Loss/Latency)
│   │   └── Fitting Accuracy Profile (MAE and RMSE evaluation blocks)
│   │
│   ├── Alerts.jsx (Incident Center Page)
│   │   ├── Active Outage Alarms (Node outage cards)
│   │   ├── Operational Feed (Historical incidents list)
│   │   └── Force Refresh (Loading triggers)
│   │
│   ├── Settings.jsx (Configuration Center Page)
│   │   ├── Transmission Frequencies Inputs (Data/heartbeat loop timers configuration)
│   │   ├── Network Quality Constraints (Packet losses, latencies, baseline RSSI sliders)
│   │   ├── Power Consumption Simulation (Battery idle discharge, transmit costs inputs)
│   │   └── Action Spinners (Save and Reset spinner loaders)
│   │
│   └── ExportCenter.jsx (Export Center Page)
│       ├── Node Logs Ingestor (Dataset range selections)
│       └── CSV Exporter Actions (Query bounds triggers)
│
└── ui/
    └── Skeletons.jsx (Modular transition UI skeletons)
        ├── CardSkeleton (Pulsing metric boxes)
        ├── TableSkeleton (Pulsing data rows)
        ├── TopologySkeleton (Pulsing SVG diagrams placeholder)
        ├── SettingsSkeleton (Pulsing configuration form boxes)
        ├── ChartSkeleton (Pulsing grid panels placeholder)
        └── ErrorCard (State recovery retry panels)
```