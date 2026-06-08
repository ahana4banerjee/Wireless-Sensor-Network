import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from ..schemas import AnomaliesResponse, AnalyticsSummary, AnomalyRecord

router = APIRouter()

# Define dataset absolute path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "data", "processed", "wsn_dataset.csv"))

def load_dataset():
    """Loads the unified WSN dataset from the processed folder."""
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(
            status_code=404, 
            detail="Unified processed dataset not found. Please run the data merging pipeline first."
        )
    try:
        df = pd.read_csv(DATASET_PATH)
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")

@router.get("/anomalies", response_model=AnomaliesResponse)
def get_anomalies(limit: int = 50):
    """Returns total anomalies count, anomaly percentage, and a list of recent anomalies."""
    df = load_dataset()
    
    anomalies_df = df[df["anomaly_flag"] == 1]
    total_records = len(df)
    total_anomalies = len(anomalies_df)
    
    anomaly_percentage = 0.0
    if total_records > 0:
        anomaly_percentage = round((total_anomalies / total_records) * 100.0, 2)
        
    # Get recent anomalies (sorted by unix_ts descending)
    recent_anomalies_df = anomalies_df.sort_values(by="unix_ts", ascending=False).head(limit)
    
    recent_anomalies = []
    for _, row in recent_anomalies_df.iterrows():
        row_dict = row.to_dict()
        
        # Safely replace NaNs to prevent JSON serialization errors
        for k, v in row_dict.items():
            if pd.isna(v):
                row_dict[k] = 0.0 if k in ["temp", "humidity", "pressure", "wind_speed", "battery_level", "signal_strength", "latency_ms", "packet_loss_rate"] else ""
                
        recent_anomalies.append(AnomalyRecord(
            timestamp=str(row_dict.get("timestamp", "")),
            unix_ts=float(row_dict.get("unix_ts", 0.0)),
            node_id=str(row_dict.get("node_id", "")),
            condition=str(row_dict.get("condition", "")),
            temp=float(row_dict.get("temp", 0.0)),
            humidity=float(row_dict.get("humidity", 0.0)),
            pressure=float(row_dict.get("pressure", 0.0)),
            wind_speed=float(row_dict.get("wind_speed", 0.0)),
            battery_level=float(row_dict.get("battery_level", 0.0)),
            signal_strength=float(row_dict.get("signal_strength", 0.0)),
            latency_ms=float(row_dict.get("latency_ms", 0.0)),
            packet_loss_rate=float(row_dict.get("packet_loss_rate", 0.0)),
            anomaly_flag=int(row_dict.get("anomaly_flag", 1))
        ))
        
    return AnomaliesResponse(
        total_anomalies=total_anomalies,
        anomaly_percentage=anomaly_percentage,
        recent_anomalies=recent_anomalies
    )

@router.get("/analytics/summary", response_model=AnalyticsSummary)
def get_analytics_summary():
    """Returns general summary statistics calculated over the entire dataset."""
    df = load_dataset()
    total_records = len(df)
    anomaly_count = int((df["anomaly_flag"] == 1).sum())
    
    if total_records == 0:
        return AnalyticsSummary(
            total_records=0,
            anomaly_count=0,
            average_temperature=0.0,
            average_humidity=0.0,
            average_battery_level=0.0,
            average_latency=0.0,
            average_packet_loss=0.0
        )
        
    avg_temp = float(df["temp"].mean())
    avg_hum = float(df["humidity"].mean())
    avg_bat = float(df["battery_level"].mean())
    avg_lat = float(df["latency_ms"].mean())
    avg_loss = float(df["packet_loss_rate"].mean())
    
    return AnalyticsSummary(
        total_records=total_records,
        anomaly_count=anomaly_count,
        average_temperature=round(avg_temp, 2),
        average_humidity=round(avg_hum, 2),
        average_battery_level=round(avg_bat, 2),
        average_latency=round(avg_lat, 2),
        average_packet_loss=round(avg_loss, 2)
    )
