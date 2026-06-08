import os
import time
import json
import pandas as pd
from fastapi import APIRouter
from typing import List
from ..schemas import AlertResponse
from .nodes import get_latest_telemetry_for_all

router = APIRouter()

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "data", "logs"))
ALERTS_LOG_PATH = os.path.join(LOGS_DIR, "alerts.log")
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "data", "processed", "wsn_dataset.csv"))

def check_latest_anomaly(node_id):
    """Checks the final record of the processed master dataset to see if anomaly is flagged."""
    if not os.path.exists(DATASET_PATH):
        return False
    try:
        # Load last 100 rows to quickly check this node
        df = pd.read_csv(DATASET_PATH)
        node_df = df[df["node_id"] == node_id]
        if not node_df.empty:
            return int(node_df.iloc[-1].get("anomaly_flag", 0)) == 1
    except Exception:
        pass
    return False

@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(include_history: bool = True, limit: int = 50):
    """
    Returns structured alert objects. Combines real-time dynamic alerts 
    (from active metrics thresholds) and logged historical alerts.
    """
    alerts_list = []
    current_time = time.time()
    
    # 1. Generate Dynamic Alerts based on latest live telemetry
    telemetry_list = get_latest_telemetry_for_all()
    for t in telemetry_list:
        node_id = str(t.get("node_id", t.get("city", "")))
        unix_ts = float(t.get("unix_ts", 0))
        timestamp = str(t.get("timestamp", time.ctime(unix_ts)))
        
        # Check node offline timeout (45s)
        if (current_time - unix_ts) > 45.0:
            alerts_list.append(AlertResponse(
                node_id=node_id,
                alert_type="OFFLINE",
                severity="CRITICAL",
                message=f"Node heartbeat timeout. Node is OFFLINE for {round(current_time - unix_ts, 1)} seconds.",
                value=round(current_time - unix_ts, 1),
                timestamp=timestamp
            ))
            # If offline, skip threshold checks since no fresh telemetry exists
            continue
            
        # Check Low Battery
        battery = float(t.get("battery_level", 100.0))
        if battery < 20.0:
            severity = "CRITICAL" if battery < 5.0 else "WARNING"
            alerts_list.append(AlertResponse(
                node_id=node_id,
                alert_type="BATTERY",
                severity=severity,
                message=f"Battery level is dangerously low: {battery}%",
                value=battery,
                timestamp=timestamp
            ))
            
        # Check High Latency
        latency = float(t.get("latency_ms", 0.0))
        if latency > 1000.0:
            alerts_list.append(AlertResponse(
                node_id=node_id,
                alert_type="LATENCY",
                severity="WARNING",
                message=f"Transmission latency is high: {latency} ms",
                value=latency,
                timestamp=timestamp
            ))
            
        # Check Weak Signal Strength
        rssi = float(t.get("signal_strength", -60.0))
        if rssi < -85.0:
            alerts_list.append(AlertResponse(
                node_id=node_id,
                alert_type="SIGNAL_STRENGTH",
                severity="WARNING",
                message=f"Signal strength is weak: {rssi} dBm",
                value=rssi,
                timestamp=timestamp
            ))
            
        # Check High Packet Loss
        loss = float(t.get("packet_loss_rate", 0.0))
        if loss > 5.0:
            severity = "CRITICAL" if loss > 10.0 else "WARNING"
            alerts_list.append(AlertResponse(
                node_id=node_id,
                alert_type="PACKET_LOSS",
                severity=severity,
                message=f"Packet loss rate is elevated: {loss}%",
                value=loss,
                timestamp=timestamp
            ))
            
        # Check Machine Learning Anomaly Detection
        if check_latest_anomaly(node_id):
            alerts_list.append(AlertResponse(
                node_id=node_id,
                alert_type="ANOMALY",
                severity="WARNING",
                message="Machine Learning anomaly flagged on recent telemetry features.",
                value=1.0,
                timestamp=timestamp
            ))

    # 2. Append Historical Logged Alerts (from backend.py fault_detector logs)
    if include_history and os.path.exists(ALERTS_LOG_PATH):
        try:
            history_alerts = []
            with open(ALERTS_LOG_PATH, "r", encoding="utf-8") as f:
                # Read lines in reverse to get the latest alerts first
                lines = f.readlines()
                for line in reversed(lines):
                    if len(history_alerts) >= limit:
                        break
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        alert_data = json.loads(line)
                        history_alerts.append(AlertResponse(
                            node_id=str(alert_data.get("node_id", "")),
                            alert_type=str(alert_data.get("alert_type", "")),
                            severity=str(alert_data.get("severity", "")),
                            message=str(alert_data.get("message", "")),
                            value=float(alert_data.get("value", 0.0)),
                            timestamp=str(alert_data.get("timestamp", ""))
                        ))
                    except (json.JSONDecodeError, ValueError):
                        continue
            alerts_list.extend(history_alerts)
        except Exception as e:
            print(f"Error reading alerts log: {e}")
            
    return alerts_list
