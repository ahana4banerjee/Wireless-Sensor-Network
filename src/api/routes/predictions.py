import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas import PredictionRecord, AllNodesForecastSummary, NodeForecastDetail
from .nodes import get_latest_telemetry_for_all
from src.utils.forecast_engine import forecast_engine

router = APIRouter()

# Define predictions absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PREDICTIONS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "predictions"))

def load_predictions(subfolder, filename, limit=100):
    """Loads target predictions CSV file and returns the latest records."""
    file_path = os.path.join(PREDICTIONS_DIR, subfolder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail=f"Predictions file '{filename}' not found. Please run the predictive model script first."
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
        raise HTTPException(status_code=500, detail=f"Failed to load predictions: {e}")

@router.get("/predictions/temperature", response_model=List[PredictionRecord])
def get_temperature_predictions(limit: int = 100):
    """Returns the latest temperature predictions containing actuals vs predicted values."""
    return load_predictions("environmental_predictions", "temperature_predictions.csv", limit)

@router.get("/predictions/humidity", response_model=List[PredictionRecord])
def get_humidity_predictions(limit: int = 100):
    """Returns the latest humidity predictions containing actuals vs predicted values."""
    return load_predictions("environmental_predictions", "humidity_predictions.csv", limit)

@router.get("/predictions/forecast", response_model=AllNodesForecastSummary)
def get_all_nodes_forecast(horizon: int = 72, step: int = 3):
    """
    Generates rolling forecasts, risk levels, confidence scores,
    and operational insights for all registered active WSN nodes.
    """
    telemetry_list = get_latest_telemetry_for_all()
    nodes_forecasts = {}
    critical_risks = 0
    high_risks = 0
    medium_risks = 0
    normal_nodes = 0
    
    for t in telemetry_list:
        node_id = str(t.get("node_id", t.get("city", "")))
        try:
            fc = forecast_engine.generate_forecast(node_id, t, hours_horizon=horizon, step_hours=step)
            nodes_forecasts[node_id] = fc
            
            risk = fc["overall_risk_level"]
            if risk == "CRITICAL":
                critical_risks += 1
            elif risk == "HIGH":
                high_risks += 1
            elif risk == "MEDIUM":
                medium_risks += 1
            else:
                normal_nodes += 1
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate forecast for {node_id}: {e}")
            
    return AllNodesForecastSummary(
        total_nodes=len(telemetry_list),
        critical_risks=critical_risks,
        high_risks=high_risks,
        medium_risks=medium_risks,
        normal_nodes=normal_nodes,
        nodes=nodes_forecasts
    )

@router.get("/predictions/forecast/{node_id}", response_model=NodeForecastDetail)
def get_node_forecast(node_id: str, horizon: int = 72, step: int = 3):
    """
    Returns the detailed forecast timeline, confidence intervals,
    and operational insights for a specific node ID.
    """
    telemetry_list = get_latest_telemetry_for_all()
    target_data = None
    for t in telemetry_list:
        if str(t.get("node_id", t.get("city", ""))) == node_id:
            target_data = t
            break
            
    if not target_data:
        raise HTTPException(
            status_code=404, 
            detail=f"Node telemetry history for '{node_id}' not found. Please ensure the node is registered and active."
        )
        
    try:
        fc = forecast_engine.generate_forecast(node_id, target_data, hours_horizon=horizon, step_hours=step)
        return fc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast for {node_id}: {e}")

