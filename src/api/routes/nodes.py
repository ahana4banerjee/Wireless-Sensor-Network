import os
import glob
import time
import pandas as pd
from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas import NodesResponse, NodeHealth, TelemetryRecord

router = APIRouter()

# Define logs directory absolute path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "data", "logs"))

def get_latest_telemetry_for_all():
    """Reads the final row of each city telemetry history log file."""
    telemetry = []
    if not os.path.exists(LOG_DIR):
        return telemetry
        
    pattern = os.path.join(LOG_DIR, "*_history.csv")
    for filepath in glob.glob(pattern):
        filename = os.path.basename(filepath)
        city = filename.replace("_history.csv", "")
        try:
            df = pd.read_csv(filepath)
            if not df.empty:
                last_row = df.iloc[-1].to_dict()
                # Safely clean up any nan fields to prevent Pydantic validation failures
                for k, v in last_row.items():
                    if pd.isna(v):
                        last_row[k] = 0.0 if k in ["temp", "humidity", "pressure", "wind_speed", "battery_level", "signal_strength", "latency_ms", "packet_loss_rate"] else ""
                last_row["city"] = city
                telemetry.append(last_row)
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            
    # Sort by node_id alphabetically for consistent order
    telemetry.sort(key=lambda x: x.get("node_id", ""))
    return telemetry

@router.get("/nodes", response_model=NodesResponse)
def get_nodes():
    """Returns total active nodes list with names, status, and health metrics."""
    telemetry_list = get_latest_telemetry_for_all()
    nodes_health = []
    current_time = time.time()
    
    for t in telemetry_list:
        unix_ts = float(t.get("unix_ts", 0))
        # ONLINE if heartbeat was received within last 45 seconds (matching HEALTH_THRESHOLD)
        status = "ONLINE" if (current_time - unix_ts) <= 45.0 else "OFFLINE"
        
        nodes_health.append(NodeHealth(
            node_id=str(t.get("node_id", t.get("city", ""))),
            status=status,
            battery_level=float(t.get("battery_level", 0.0)),
            signal_strength=float(t.get("signal_strength", 0.0))
        ))
        
    return NodesResponse(total_nodes=len(nodes_health), nodes=nodes_health)

@router.get("/live-data", response_model=List[TelemetryRecord])
def get_live_telemetry():
    """Returns the absolute latest telemetry record for each WSN node."""
    telemetry_list = get_latest_telemetry_for_all()
    records = []
    
    for t in telemetry_list:
        records.append(TelemetryRecord(
            city=str(t.get("node_id", t.get("city", ""))),
            temp=float(t.get("temp", 0.0)),
            humidity=float(t.get("humidity", 0.0)),
            pressure=float(t.get("pressure", 0.0)),
            wind_speed=float(t.get("wind_speed", 0.0)),
            battery_level=float(t.get("battery_level", 0.0)),
            signal_strength=float(t.get("signal_strength", 0.0)),
            latency_ms=float(t.get("latency_ms", 0.0)),
            packet_loss_rate=float(t.get("packet_loss_rate", 0.0)),
            timestamp=str(t.get("timestamp", ""))
        ))
        
    return records
