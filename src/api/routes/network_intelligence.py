import os
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..schemas import NodeHealthDetails, NetworkPredictionsResponse, SystemScoreResponse, PredictionRecord
from .nodes import get_latest_telemetry_for_all

router = APIRouter()

# Define predictions absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PREDICTIONS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "predictions", "network_predictions"))

def compute_nhi(battery_level, signal_strength, latency_ms, packet_loss_rate):
    # battery_score: battery_level (0-100)
    battery_score = min(max(float(battery_level), 0.0), 100.0)
    
    # signal_score: RSSI scaled between -90 dBm (0) and -50 dBm (100)
    signal_score = (float(signal_strength) + 90.0) / 40.0 * 100.0
    signal_score = min(max(signal_score, 0.0), 100.0)
    
    # latency_score: latency scaled between 1500 ms (0) and 100 ms (100)
    latency_score = (1500.0 - float(latency_ms)) / 1400.0 * 100.0
    latency_score = min(max(latency_score, 0.0), 100.0)
    
    # packet_loss_score: packet loss scaled between 10% (0) and 0% (100)
    packet_loss_score = (10.0 - float(packet_loss_rate)) * 10.0
    packet_loss_score = min(max(packet_loss_score, 0.0), 100.0)
    
    # Weighted final score: 35% battery + 25% signal + 20% latency + 20% packet loss
    health_score = 0.35 * battery_score + 0.25 * signal_score + 0.20 * latency_score + 0.20 * packet_loss_score
    health_score = min(max(health_score, 0.0), 100.0)
    
    # Categorize status labels
    if health_score >= 90.0:
        status = "EXCELLENT"
    elif health_score >= 75.0:
        status = "GOOD"
    elif health_score >= 60.0:
        status = "WARNING"
    elif health_score >= 40.0:
        status = "CRITICAL"
    else:
        status = "FAILING"
        
    return {
        "battery_score": battery_score,
        "signal_score": signal_score,
        "latency_score": latency_score,
        "packet_loss_score": packet_loss_score,
        "network_health_score": health_score,
        "network_health_status": status
    }

def load_gb_predictions(filename: str, limit: int = 100) -> List[PredictionRecord]:
    file_path = os.path.join(PREDICTIONS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Network predictions file '{filename}' not found. Please run the training pipeline first."
        )
    try:
        df = pd.read_csv(file_path)
        # Sort chronologically by unix_ts descending to fetch the latest predictions
        df_sorted = df.sort_values(by="unix_ts", ascending=False).head(limit)
        
        records = []
        for _, row in df_sorted.iterrows():
            row_dict = row.to_dict()
            records.append(PredictionRecord(
                unix_ts=float(row_dict.get("unix_ts", 0.0)),
                timestamp=str(row_dict.get("timestamp", "")),
                actual=float(row_dict.get("actual", 0.0)),
                predicted=float(row_dict.get("predicted", 0.0))
            ))
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load predictions from {filename}: {e}")

@router.get("/network-health", response_model=List[NodeHealthDetails])
def get_network_health():
    """
    Computes and returns the deterministic Network Health Index (NHI) metrics
    for all active nodes based on their latest telemetry.
    """
    telemetry_list = get_latest_telemetry_for_all()
    results = []
    for t in telemetry_list:
        node_id = str(t.get("node_id", t.get("city", "")))
        battery_level = float(t.get("battery_level", 0.0))
        signal_strength = float(t.get("signal_strength", 0.0))
        latency_ms = float(t.get("latency_ms", 0.0))
        packet_loss_rate = float(t.get("packet_loss_rate", 0.0))
        timestamp = str(t.get("timestamp", ""))
        
        nhi_data = compute_nhi(battery_level, signal_strength, latency_ms, packet_loss_rate)
        
        results.append(NodeHealthDetails(
            node_id=node_id,
            battery_level=battery_level,
            signal_strength=signal_strength,
            latency_ms=latency_ms,
            packet_loss_rate=packet_loss_rate,
            timestamp=timestamp,
            battery_score=nhi_data["battery_score"],
            signal_score=nhi_data["signal_score"],
            latency_score=nhi_data["latency_score"],
            packet_loss_score=nhi_data["packet_loss_score"],
            network_health_score=nhi_data["network_health_score"],
            network_health_status=nhi_data["network_health_status"]
        ))
    return results

@router.get("/network-predictions", response_model=NetworkPredictionsResponse)
def get_network_predictions(limit: int = Query(default=100, ge=1, le=1000)):
    """
    Exposes Gradient Boosting actual vs predicted test observations
    for battery, latency, and packet loss.
    """
    battery_preds = load_gb_predictions("gb_battery_predictions.csv", limit)
    latency_preds = load_gb_predictions("gb_latency_predictions.csv", limit)
    packet_loss_preds = load_gb_predictions("gb_packet_loss_predictions.csv", limit)
    
    return NetworkPredictionsResponse(
        battery=battery_preds,
        latency=latency_preds,
        packet_loss=packet_loss_preds
    )

@router.get("/system-score", response_model=SystemScoreResponse)
def get_system_score():
    """
    Aggregates overall health scores to calculate WSN system score statistics.
    """
    health_details = get_network_health()
    if not health_details:
        return SystemScoreResponse(
            average_health=0.0,
            status_counts={
                "EXCELLENT": 0,
                "GOOD": 0,
                "WARNING": 0,
                "CRITICAL": 0,
                "FAILING": 0
            },
            active_nodes=0,
            system_status="FAILING"
        )
    
    total_health = 0.0
    status_counts = {
        "EXCELLENT": 0,
        "GOOD": 0,
        "WARNING": 0,
        "CRITICAL": 0,
        "FAILING": 0
    }
    
    for details in health_details:
        total_health += details.network_health_score
        status = details.network_health_status
        if status in status_counts:
            status_counts[status] += 1
            
    avg_health = total_health / len(health_details)
    
    if avg_health >= 90.0:
        system_status = "EXCELLENT"
    elif avg_health >= 75.0:
        system_status = "GOOD"
    elif avg_health >= 60.0:
        system_status = "WARNING"
    elif avg_health >= 40.0:
        system_status = "CRITICAL"
    else:
        system_status = "FAILING"
        
    return SystemScoreResponse(
        average_health=avg_health,
        status_counts=status_counts,
        active_nodes=len(health_details),
        system_status=system_status
    )
