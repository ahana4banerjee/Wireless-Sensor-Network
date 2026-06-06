import os
import pandas as pd
from sklearn.ensemble import IsolationForest

# Define absolute paths based on this file's location to ensure it runs from any CWD
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "data", "processed", "wsn_dataset.csv"))

FEATURES = [
    "temp", "humidity", "pressure", "battery_level", 
    "signal_strength", "latency_ms", "packet_loss_rate"
]

def run_anomaly_detection(contamination=0.05):
    """
    Loads the processed WSN dataset, applies an Isolation Forest model on
    selected features to detect anomalies, and saves the updated dataset
    with an 'anomaly_flag' column.
    """
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Processed dataset not found at {DATASET_PATH}")
        return None

    try:
        # 1. Load dataset
        df = pd.read_csv(DATASET_PATH)
        print(f"Loaded dataset with {len(df)} rows.")

        # 2. Extract features and handle NaNs/missing values
        X = df[FEATURES].copy()
        for col in FEATURES:
            if X[col].isnull().any():
                # Fill missing values with column medians for robust processing
                X[col] = X[col].fillna(X[col].median())

        # 3. Train Isolation Forest
        print("Training Isolation Forest model...")
        model = IsolationForest(contamination=contamination, random_state=42)
        
        # Fit model and predict
        # Isolation Forest returns -1 for anomalies, 1 for normal data
        preds = model.fit_predict(X)
        
        # Map predictions to anomaly_flag (1 for anomaly, 0 for normal)
        df['anomaly_flag'] = [1 if x == -1 else 0 for x in preds]
        
        # Summarize results
        num_anomalies = (df['anomaly_flag'] == 1).sum()
        print(f"Detected {num_anomalies} anomalies ({round(num_anomalies/len(df)*100, 2)}% of dataset).")

        # 4. Save updated dataset
        df.to_csv(DATASET_PATH, index=False)
        print(f"Successfully saved updated dataset with 'anomaly_flag' to: {DATASET_PATH}")
        return DATASET_PATH
        
    except Exception as e:
        print(f"Error during anomaly detection: {e}")
        return None

if __name__ == "__main__":
    run_anomaly_detection()
