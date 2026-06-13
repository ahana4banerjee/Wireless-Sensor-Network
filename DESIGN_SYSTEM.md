# WSN Platform Design System Specification

This document details the UI styling system, typographic parameters, color tokens, and layout guidelines for the WSN Simulation Frontend Client.

---

## 1. Core Visual Theme
The visual interface is designed to emulate professional, high-density industrial control interfaces such as **Grafana**, **Datadog**, **Kibana**, and physical Network Operations Center (NOC) dashboards. 

We prioritize **information density, operational visibility, and a monitoring-first user experience** over decorative design trends.

---

## 2. Color System Token Registry

The palette uses dark background tokens contrasted with status indicator accents:

### Backgrounds & Borders
*   **Central Workspace Background**: `#020617` (slate-950) - Solid dark base layer.
*   **Console Status Strip**: `#0b1121` - Dark navy overlay base for executive meters.
*   **Card Backgrounds**: `#0f172a` (slate-900) - Containers for data components.
*   **Borders & Dividers**: `#1e293b` (slate-800) - Separates visual grid cards.

### Accents & Status Indicators
*   **Healthy State (Green)**: `#10b981` (emerald-500) - Signifies standard, low-loss telemetry.
*   **Warning State (Yellow)**: `#f59e0b` (amber-500) - Signifies degraded RSSI, minor packet losses, or early low battery metrics.
*   **Fault State (Red)**: `#ef4444` (rose-500) / `#dc2626` (red-600) - Signifies absolute node outages or depleted batteries.
*   **Analytics / ML Elements (Purple)**: `#8b5cf6` (violet-600) - Defines prediction forecasts, model plots, and ML anomalies highlights.
*   **Network Metrics (Cyan/Blue)**: `#06b6d4` (cyan-500) / `#3b82f6` (blue-500) - Used for RSSI, latency metrics, and network indicators.

---

## 3. Typography Guidelines

*   **Primary Font-Face (Interface Labels)**: Standard geometric sans-serif (e.g. `Inter`, `Roboto`, `system-ui`). Clean, high readability at small text sizes.
*   **Secondary Font-Face (Telemetry & Numerical Tables)**: Monospaced font families (e.g. `JetBrains Mono`, `SF Mono`, `monospace`). Ensures digit alignment across tables, timestamps, packet sequence counters, and numerical data feeds.

---

## 4. UI Grid & Layout Densities

*   **Layout Spacing**: Strict grid borders spacing (`gap-4` to `gap-6` constants). Cards are aligned to clean, symmetric layouts without floating shadows.
*   **Table Cell Density**: Low-padding layout (`py-2.5` to `py-3` cells) to ensure maximum telemetry records fit within scrollable panels without waste.
*   **Charts**: Recharts graphs are enclosed in container cards with thin grid gridlines, utilizing tooltips formatted with dark navy borders to match the overall theme.

---

## 5. UI Animations & Keyframe Transitions

*   **SVG Stream flow (`flow-line-active`)**:
    *   *Behavior*: Animated dash-offset shifting on SVG links.
    *   *Implementation*: `stroke-dasharray="8,4"` with CSS animations shifting `stroke-dashoffset` from `12` to `0` infinitely, denoting active communications loops.
    *   *Outage Interaction*: Link lines instantly switch to static solid red lines on node outage events.
*   **Pulsing Skeletons (`animate-pulse`)**:
    *   *Behavior*: Opacity fades infinitely to represent background queries.
    *   *Implementation*: Background boxes transition between 30% and 80% opacity.
*   **Spinner Spin (`animate-spin`)**:
    *   *Behavior*: Continuous rotational animation for loaders.
    *   *Implementation*: Infinite 360-degree rotation applied to SVG loader shapes during 2.0-second delay locks.