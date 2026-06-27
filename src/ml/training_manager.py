import os
import sys
import json
import time
import shutil
import logging
import pandas as pd
import numpy as np
import joblib
from datetime import datetime

# Setup paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
sys.path.append(PROJECT_ROOT)

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Path constants
SETTINGS_PATH = os.path.join(PROJECT_ROOT, "configs", "settings.json")
DATASET_PATH = os.path.join(PROJECT_ROOT, "data", "processed", "wsn_dataset.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
REGISTRY_PATH = os.path.join(MODELS_DIR, "registry.json")
LOG_DIR = os.path.join(PROJECT_ROOT, "data", "logs")
TRAINING_LOG_PATH = os.path.join(LOG_DIR, "training.log")

PREDICTIONS_ENV_DIR = os.path.join(PROJECT_ROOT, "predictions", "environmental_predictions")
PREDICTIONS_NET_DIR = os.path.join(PROJECT_ROOT, "predictions", "network_predictions")

# Setup logging
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(TRAINING_LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("TrainingManager")

# Model definitions
MODEL_KEYS = [
    "temp_model", "humidity_model",
    "battery_model", "latency_model", "packet_loss_model",
    "gb_battery_model", "gb_latency_model", "gb_packet_loss_model",
    "anomaly_model"
]

def load_settings():
    try:
        with open(SETTINGS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load settings.json: {e}")
        return {}

def read_registry():
    if not os.path.exists(REGISTRY_PATH):
        return {}
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read registry.json: {e}")
        return {}

def save_registry(registry):
    os.makedirs(MODELS_DIR, exist_ok=True)
    try:
        with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=4)
    except Exception as e:
        logger.error(f"Failed to write registry.json: {e}")

def calculate_network_health(data):
    battery = data["battery_level"]
    signal = data["signal_strength"]
    latency = data["latency_ms"]
    loss = data["packet_loss_rate"]
    
    battery_norm = battery
    signal_norm = (signal - (-100.0)) / ((-30.0) - (-100.0)) * 100.0
    if isinstance(signal_norm, pd.Series):
        signal_norm = signal_norm.clip(0.0, 100.0)
    else:
        signal_norm = max(0.0, min(100.0, signal_norm))
        
    latency_norm = (1500.0 - latency) / 1500.0 * 100.0
    if isinstance(latency_norm, pd.Series):
        latency_norm = latency_norm.clip(0.0, 100.0)
    else:
        latency_norm = max(0.0, min(100.0, latency_norm))
        
    loss_norm = 100.0 - loss
    if isinstance(loss_norm, pd.Series):
        loss_norm = loss_norm.clip(0.0, 100.0)
    else:
        loss_norm = max(0.0, min(100.0, loss_norm))
        
    return 0.35 * battery_norm + 0.25 * signal_norm + 0.20 * latency_norm + 0.20 * loss_norm

def prepare_all_data():
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Processed dataset not found at: {DATASET_PATH}")
        
    df = pd.read_csv(DATASET_PATH)
    
    # 1. Environmental Features Engineering
    dt_series = pd.to_datetime(df['unix_ts'], unit='s')
    df['hour'] = dt_series.dt.hour
    df['day'] = dt_series.dt.day
    df['month'] = dt_series.dt.month
    
    # 2. Network Features Engineering
    df["network_health_score"] = calculate_network_health(df)
    df = df.sort_values(by=["node_id", "unix_ts"]).reset_index(drop=True)
    
    df["previous_battery_level"] = df.groupby("node_id")["battery_level"].shift(1)
    df["previous_latency"] = df.groupby("node_id")["latency_ms"].shift(1)
    df["previous_packet_loss"] = df.groupby("node_id")["packet_loss_rate"].shift(1)
    df["previous_signal_strength"] = df.groupby("node_id")["signal_strength"].shift(1)
    df["previous_health"] = df.groupby("node_id")["network_health_score"].shift(1)
    df["previous_anomaly_flag"] = df.groupby("node_id")["anomaly_flag"].shift(1)
    
    df["battery_change_rate"] = df.groupby("node_id")["battery_level"].diff(1)
    df["latency_change_rate"] = df.groupby("node_id")["latency_ms"].diff(1)
    df["packet_loss_change_rate"] = df.groupby("node_id")["packet_loss_rate"].diff(1)
    df["health_change_rate"] = df.groupby("node_id")["network_health_score"].diff(1)
    
    df["prev_battery_change_rate"] = df.groupby("node_id")["battery_change_rate"].shift(1)
    df["prev_latency_change_rate"] = df.groupby("node_id")["latency_change_rate"].shift(1)
    df["prev_packet_loss_change_rate"] = df.groupby("node_id")["packet_loss_change_rate"].shift(1)
    df["prev_health_change_rate"] = df.groupby("node_id")["health_change_rate"].shift(1)
    
    first_ts = df.groupby("node_id")["unix_ts"].transform("min")
    df["elapsed_runtime"] = df["unix_ts"] - first_ts
    
    seq_min = df.groupby("node_id")["seq_num"].transform("min")
    seq_max = df.groupby("node_id")["seq_num"].transform("max")
    df["sequence_progress"] = (df["seq_num"] - seq_min) / (seq_max - seq_min + 1e-9)
    
    df["rolling_mean_latency"] = df.groupby("node_id")["latency_ms"].transform(lambda x: x.rolling(window=5).mean())
    df["rolling_mean_packet_loss"] = df.groupby("node_id")["packet_loss_rate"].transform(lambda x: x.rolling(window=5).mean())
    df["rolling_mean_battery"] = df.groupby("node_id")["battery_level"].transform(lambda x: x.rolling(window=5).mean())
    df["rolling_mean_health"] = df.groupby("node_id")["network_health_score"].transform(lambda x: x.rolling(window=5).mean())
    
    df["rolling_std_latency"] = df.groupby("node_id")["latency_ms"].transform(lambda x: x.rolling(window=5).std())
    df["rolling_std_packet_loss"] = df.groupby("node_id")["packet_loss_rate"].transform(lambda x: x.rolling(window=5).std())
    df["rolling_std_battery"] = df.groupby("node_id")["battery_level"].transform(lambda x: x.rolling(window=5).std())
    df["rolling_std_health"] = df.groupby("node_id")["network_health_score"].transform(lambda x: x.rolling(window=5).std())
    
    df["prev_rolling_mean_battery"] = df.groupby("node_id")["rolling_mean_battery"].shift(1)
    df["prev_rolling_std_battery"] = df.groupby("node_id")["rolling_std_battery"].shift(1)
    df["prev_rolling_mean_latency"] = df.groupby("node_id")["rolling_mean_latency"].shift(1)
    df["prev_rolling_std_latency"] = df.groupby("node_id")["rolling_std_latency"].shift(1)
    df["prev_rolling_mean_packet_loss"] = df.groupby("node_id")["rolling_mean_packet_loss"].shift(1)
    df["prev_rolling_std_packet_loss"] = df.groupby("node_id")["rolling_std_packet_loss"].shift(1)
    df["prev_rolling_mean_health"] = df.groupby("node_id")["rolling_mean_health"].shift(1)
    df["prev_rolling_std_health"] = df.groupby("node_id")["rolling_std_health"].shift(1)
    
    return df

def get_deployed_model(model_key, registry):
    if model_key not in registry:
        return None
    active_ver = registry[model_key].get("active_version")
    if not active_ver:
        return None
    for entry in registry[model_key].get("history", []):
        if entry.get("version") == active_ver:
            filename = entry.get("filename")
            model_path = os.path.join(MODELS_DIR, filename)
            if os.path.exists(model_path):
                try:
                    return joblib.load(model_path)
                except Exception as e:
                    logger.error(f"Error loading deployed model {filename}: {e}")
    return None

def evaluate_predictions(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    return float(mae), float(rmse), float(r2)

def retrain_models(bootstrap=False):
    logger.info("Starting model training pipeline...")
    
    try:
        df = prepare_all_data()
    except Exception as e:
        logger.error(f"Data preparation failed: {e}")
        return False
        
    registry = read_registry()
    dataset_size = len(df)
    
    # Define features
    TEMP_FEATURES = ["unix_ts", "pressure", "wind_speed", "humidity", "hour", "day", "month"]
    HUMIDITY_FEATURES = ["unix_ts", "pressure", "wind_speed", "temp", "hour", "day", "month"]
    
    BATTERY_FEATURES = ["unix_ts", "signal_strength", "latency_ms", "packet_loss_rate", "anomaly_flag"]
    LATENCY_FEATURES = ["unix_ts", "signal_strength", "packet_loss_rate", "battery_level"]
    PACKET_LOSS_FEATURES = ["unix_ts", "signal_strength", "battery_level", "latency_ms"]
    
    features_A = [
        "previous_battery_level", "previous_latency", "previous_packet_loss",
        "prev_battery_change_rate", "latency_change_rate", "packet_loss_change_rate",
        "elapsed_runtime", "sequence_progress",
        "rolling_mean_latency", "rolling_mean_packet_loss", "prev_rolling_mean_battery",
        "rolling_std_latency", "rolling_std_packet_loss", "prev_rolling_std_battery",
        "anomaly_flag", "signal_strength", "latency_ms", "packet_loss_rate"
    ]
    features_B = [
        "previous_battery_level", "previous_latency", "previous_packet_loss",
        "battery_change_rate", "prev_latency_change_rate", "packet_loss_change_rate",
        "elapsed_runtime", "sequence_progress",
        "prev_rolling_mean_latency", "rolling_mean_packet_loss", "rolling_mean_battery",
        "prev_rolling_std_latency", "rolling_std_packet_loss", "rolling_std_battery",
        "anomaly_flag", "signal_strength", "battery_level", "packet_loss_rate"
    ]
    features_C = [
        "previous_battery_level", "previous_latency", "previous_packet_loss",
        "battery_change_rate", "latency_change_rate", "prev_packet_loss_change_rate",
        "elapsed_runtime", "sequence_progress",
        "rolling_mean_latency", "prev_rolling_mean_packet_loss", "rolling_mean_battery",
        "rolling_std_latency", "prev_rolling_std_packet_loss", "rolling_std_battery",
        "anomaly_flag", "signal_strength", "battery_level", "latency_ms"
    ]
    
    ANOMALY_FEATURES = ["temp", "humidity", "pressure", "battery_level", "signal_strength", "latency_ms", "packet_loss_rate"]
    
    # We will build models one-by-one
    models_to_train = [
        ("temp_model", TEMP_FEATURES, "temp", LinearRegression, "LinearRegression"),
        ("humidity_model", HUMIDITY_FEATURES, "humidity", LinearRegression, "LinearRegression"),
        
        ("battery_model", BATTERY_FEATURES, "battery_level", LinearRegression, "LinearRegression"),
        ("latency_model", LATENCY_FEATURES, "latency_ms", LinearRegression, "LinearRegression"),
        ("packet_loss_model", PACKET_LOSS_FEATURES, "packet_loss_rate", LinearRegression, "LinearRegression"),
        
        ("gb_battery_model", features_A, "battery_level", lambda: GradientBoostingRegressor(random_state=42), "GradientBoostingRegressor"),
        ("gb_latency_model", features_B, "latency_ms", lambda: GradientBoostingRegressor(random_state=42), "GradientBoostingRegressor"),
        ("gb_packet_loss_model", features_C, "packet_loss_rate", lambda: GradientBoostingRegressor(random_state=42), "GradientBoostingRegressor"),
    ]
    
    os.makedirs(PREDICTIONS_ENV_DIR, exist_ok=True)
    os.makedirs(PREDICTIONS_NET_DIR, exist_ok=True)
    
    any_model_deployed = False
    
    for key, feat_cols, target, algo_init, algo_name in models_to_train:
        # Preprocess to drop target NaNs
        sub_df = df.dropna(subset=feat_cols + [target]).reset_index(drop=True)
        if len(sub_df) < 20:
            logger.warning(f"Not enough clean rows for model {key}: {len(sub_df)}. Skipping.")
            continue
            
        X = sub_df[feat_cols]
        y = sub_df[target]
        
        # 80/20 train-test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=(algo_name=="LinearRegression"))
        
        candidate = algo_init()
        candidate.fit(X_train, y_train)
        preds_cand = candidate.predict(X_test)
        cand_mae, cand_rmse, cand_r2 = evaluate_predictions(y_test, preds_cand)
        
        # Evaluate deployed model on SAME test set
        deployed_model = get_deployed_model(key, registry)
        deploy_new = False
        
        if deployed_model is None or bootstrap:
            deploy_new = True
            logger.info(f"No active model or bootstrapping for {key}. Deploying v1.")
        else:
            try:
                preds_dep = deployed_model.predict(X_test)
                dep_mae, dep_rmse, dep_r2 = evaluate_predictions(y_test, preds_dep)
                # Performance comparison: deploy if validation R2 improves
                if cand_r2 > dep_r2:
                    deploy_new = True
                    logger.info(f"Candidate for {key} improved R2 from {dep_r2:.4f} to {cand_r2:.4f}. Deploying.")
                else:
                    logger.info(f"Candidate for {key} did not improve performance (R2: {cand_r2:.4f} vs Deployed R2: {dep_r2:.4f}). Discarding candidate.")
            except Exception as e:
                logger.error(f"Error evaluating active model for {key}: {e}. Falling back to deploying candidate.")
                deploy_new = True
                
        if deploy_new:
            any_model_deployed = True
            # Determine new version
            current_ver = registry.get(key, {}).get("active_version", "v0")
            new_ver_num = int(current_ver.replace("v", "")) + 1
            new_version = f"v{new_ver_num}"
            
            filename = f"{key}_{new_version}.pkl"
            model_path = os.path.join(MODELS_DIR, filename)
            
            # Save candidate
            joblib.dump(candidate, model_path)
            # Maintain backward compatibility legacy name
            legacy_path = os.path.join(MODELS_DIR, f"{key}.pkl")
            shutil.copy(model_path, legacy_path)
            
            # Update registry history
            if key not in registry:
                registry[key] = {"active_version": "", "history": []}
                
            # Deactivate previous active version
            for entry in registry[key]["history"]:
                if entry.get("status") == "active":
                    entry["status"] = "deployed"
                    
            new_entry = {
                "version": new_version,
                "filename": filename,
                "created_time": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "dataset_size": dataset_size,
                "metrics": {
                    "MAE": cand_mae,
                    "RMSE": cand_rmse,
                    "R2": cand_r2
                },
                "algorithm": algo_name,
                "status": "active"
            }
            registry[key]["history"].append(new_entry)
            registry[key]["active_version"] = new_version
            
            # Save predictions CSV to keep dashboard updated
            predictions_df = pd.DataFrame({
                "unix_ts": sub_df.loc[X_test.index, "unix_ts"],
                "timestamp": sub_df.loc[X_test.index, "timestamp"],
                "actual": y_test,
                "predicted": preds_cand
            }).sort_values("unix_ts")
            
            if key in ["temp_model", "humidity_model"]:
                csv_path = os.path.join(PREDICTIONS_ENV_DIR, f"{target}_predictions.csv")
                predictions_df.to_csv(csv_path, index=False)
            elif key.startswith("gb_"):
                csv_path = os.path.join(PREDICTIONS_NET_DIR, f"{key}_predictions.csv")
                # Save both versioned and legacy filenames
                predictions_df.to_csv(csv_path, index=False)
            else:
                csv_path = os.path.join(PREDICTIONS_NET_DIR, f"{target}_predictions.csv")
                predictions_df.to_csv(csv_path, index=False)
                
            logger.info(f"Model {key} version {new_version} deployed successfully.")
            
    # Retrain Isolation Forest (Anomaly Model)
    # Anomaly model is unsupervised, so we always deploy a successfully trained run
    try:
        sub_df = df.dropna(subset=ANOMALY_FEATURES).reset_index(drop=True)
        if len(sub_df) >= 20:
            X_anomaly = sub_df[ANOMALY_FEATURES]
            candidate_anom = IsolationForest(contamination=0.05, random_state=42)
            candidate_anom.fit(X_anomaly)
            
            # For logging metrics, Isolation Forest doesn't use MAE/RMSE/R2.
            # We can log contamination fraction and mean decision score.
            scores = candidate_anom.decision_function(X_anomaly)
            mean_score = float(np.mean(scores))
            
            deploy_new = True
            key = "anomaly_model"
            
            # Determine new version
            current_ver = registry.get(key, {}).get("active_version", "v0")
            new_ver_num = int(current_ver.replace("v", "")) + 1
            new_version = f"v{new_ver_num}"
            
            filename = f"{key}_{new_version}.pkl"
            model_path = os.path.join(MODELS_DIR, filename)
            
            # Save Isolation Forest
            joblib.dump(candidate_anom, model_path)
            # Copy to legacy name
            legacy_path = os.path.join(MODELS_DIR, f"{key}.pkl")
            shutil.copy(model_path, legacy_path)
            
            # Update registry history
            if key not in registry:
                registry[key] = {"active_version": "", "history": []}
                
            # Deactivate previous active version
            for entry in registry[key]["history"]:
                if entry.get("status") == "active":
                    entry["status"] = "deployed"
                    
            new_entry = {
                "version": new_version,
                "filename": filename,
                "created_time": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "dataset_size": dataset_size,
                "metrics": {
                    "MAE": 0.0,
                    "RMSE": 0.0,
                    "R2": mean_score  # Store mean decision score
                },
                "algorithm": "IsolationForest",
                "status": "active"
            }
            registry[key]["history"].append(new_entry)
            registry[key]["active_version"] = new_version
            logger.info(f"Model anomaly_model version {new_version} deployed successfully.")
            any_model_deployed = True
    except Exception as e:
        logger.error(f"Failed to train Isolation Forest model: {e}")
        
    save_registry(registry)
    return any_model_deployed

def check_and_run_pipeline():
    logger.info("Checking retraining conditions...")
    
    settings = load_settings()
    retrain_config = settings.get("retraining", {})
    
    min_new_samples = retrain_config.get("min_new_samples", 500)
    min_time_elapsed_hours = retrain_config.get("min_time_elapsed_hours", 24)
    
    # Read current dataset size
    if not os.path.exists(DATASET_PATH):
        logger.warning(f"Dataset path '{DATASET_PATH}' does not exist yet. Skipping check.")
        return
        
    try:
        df = pd.read_csv(DATASET_PATH)
        current_size = len(df)
    except Exception as e:
        logger.error(f"Error reading dataset: {e}")
        return
        
    registry = read_registry()
    
    # If registry doesn't exist or is empty, we must bootstrap it immediately
    if not registry or "temp_model" not in registry:
        logger.info("Registry is empty or uninitialized. Initializing bootstrap training...")
        retrain_models(bootstrap=True)
        return
        
    # Get last successful training details
    # We will look at temp_model to determine the last run time
    temp_model_history = registry.get("temp_model", {}).get("history", [])
    if not temp_model_history:
        logger.info("No temp_model history found. Running bootstrap training...")
        retrain_models(bootstrap=True)
        return
        
    last_run = temp_model_history[-1]
    last_size = last_run.get("dataset_size", 0)
    last_time_str = last_run.get("created_time")
    
    # Parse last time
    try:
        last_time = datetime.strptime(last_time_str, "%Y-%m-%dT%H:%M:%SZ")
        elapsed_seconds = (datetime.utcnow() - last_time).total_seconds()
        elapsed_hours = elapsed_seconds / 3600.0
    except Exception as e:
        logger.error(f"Error parsing last run timestamp: {e}")
        elapsed_hours = 999.0 # Force run
        
    new_samples = current_size - last_size
    
    logger.info(f"Current dataset size: {current_size} rows. Last training size: {last_size} rows. New samples: {new_samples} (target: {min_new_samples}).")
    logger.info(f"Hours elapsed since last training: {elapsed_hours:.2f} hours (target: {min_time_elapsed_hours} hours).")
    
    if new_samples >= min_new_samples and elapsed_hours >= min_time_elapsed_hours:
        logger.info("Retraining trigger conditions satisfied! Launching retraining pipeline...")
        retrain_models(bootstrap=False)
    else:
        logger.info("Retraining trigger conditions NOT satisfied. Skipping.")

def main():
    logger.info("--- Continuous Learning Training Manager Online ---")
    
    # 1. Bootstrap registry on startup if missing
    registry = read_registry()
    if not registry or "temp_model" not in registry:
        logger.info("Registry missing on startup. Running bootstrap training...")
        retrain_models(bootstrap=True)
        
    settings = load_settings()
    check_interval = settings.get("retraining", {}).get("check_interval_seconds", 30)
    
    logger.info(f"Starting check loop with polling interval: {check_interval} seconds.")
    
    while True:
        try:
            check_and_run_pipeline()
        except KeyboardInterrupt:
            logger.info("Training Manager stopped by user.")
            break
        except Exception as e:
            logger.error(f"Unexpected error in check loop: {e}")
            
        time.sleep(check_interval)

if __name__ == "__main__":
    main()
