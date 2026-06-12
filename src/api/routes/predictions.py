import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from typing import List
from ..schemas import PredictionRecord

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
