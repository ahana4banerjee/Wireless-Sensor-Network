import paho.mqtt.client as mqtt
import json
import pandas as pd
import time
import os
from collections import deque
import logging
from logging.handlers import RotatingFileHandler
from utils.fault_detector import FaultDetector
from utils.digital_twin_manager import twin_manager

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "..", "configs", "settings.json")

BROKER = "localhost"
PORT = 1883
BASE_TOPIC = "wsn"

if os.path.exists(CONFIG_PATH):
    try:
        with open(CONFIG_PATH, "r") as f:
            config = json.load(f)
            mqtt_config = config.get("mqtt", {})
            BROKER = mqtt_config.get("broker", BROKER)
            PORT = mqtt_config.get("port", PORT)
            BASE_TOPIC = mqtt_config.get("base_topic", BASE_TOPIC)
    except Exception as e:
        print(f"Error reading settings.json: {e}")

TOPIC_FILTER = f"{BASE_TOPIC}/+/+"  # Subscribe to all cities and all message types under the configured base topic
HEALTH_THRESHOLD = 45     # Seconds before a node is marked OFFLINE
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "logs")

# --- Standard CSV Layout ---
STANDARD_COLUMNS = [
    "timestamp", "unix_ts", "node_id", "condition", "temp", "feels_like", 
    "humidity", "pressure", "wind_speed", "visibility", "battery_level", 
    "signal_strength", "latency_ms", "packet_loss_rate", "seq_num"
]

# --- Setup Logging ---
os.makedirs(LOG_DIR, exist_ok=True)
log_file_path = os.path.join(LOG_DIR, "backend.log")

logger = logging.getLogger("WSN_Backend")
logger.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

# Console Handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# Rotating File Handler (5 MB max size, keeps 3 backups)
file_handler = RotatingFileHandler(log_file_path, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# --- In-Memory Storage for Dashboard ---
live_data_buffer = {} # Format: { "Mumbai": deque([...], maxlen=50) }
node_health = {}      # Format: { "Mumbai": last_heartbeat_timestamp }

# --- Sequence Number Tracking for Packet Loss ---
seq_tracker = {}      # Format: { "Mumbai": { "min_seq": 1, "max_seq": 10, "count": 8 } }

# --- Fault Detector Setup ---
fault_detector = FaultDetector()
ALERTS_LOG_FILE = os.path.join(LOG_DIR, "alerts.log")

def log_alert(alert):
    """Logs structured alerts to console/file loggers and appends to data/logs/alerts.log."""
    severity = alert["severity"]
    msg = f"ALERT [{alert['alert_type']}] ({severity}) - {alert['node_id']}: {alert['message']} (value: {alert['value']})"
    
    if severity == "CRITICAL":
        logger.error(msg)
    elif severity == "WARNING":
        logger.warning(msg)
    elif severity == "RESOLVED":
        logger.info(f"RESOLVED [{alert['alert_type']}] - {alert['node_id']}: {alert['message']}")
        
    try:
        with open(ALERTS_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(alert) + "\n")
    except Exception as e:
        logger.error(f"Failed to write alert to log file: {e}")

def update_packet_loss(city, seq_num):
    """Calculates running packet loss percentage based on sequence number gaps."""
    if city not in seq_tracker:
        seq_tracker[city] = {
            "min_seq": seq_num,
            "max_seq": seq_num,
            "count": 1
        }
        return 0.0

    tracker = seq_tracker[city]
    
    # Handle node reboot / sequence reset
    if seq_num < tracker["max_seq"] and seq_num < tracker["min_seq"]:
        logger.info(f"Sequence number reset detected for node {city}. Resetting packet loss tracker.")
        seq_tracker[city] = {
            "min_seq": seq_num,
            "max_seq": seq_num,
            "count": 1
        }
        return 0.0
        
    tracker["count"] += 1
    if seq_num < tracker["min_seq"]:
        tracker["min_seq"] = seq_num
    if seq_num > tracker["max_seq"]:
        tracker["max_seq"] = seq_num
        
    total_expected = tracker["max_seq"] - tracker["min_seq"] + 1
    if total_expected <= 1:
        return 0.0
        
    dropped = total_expected - tracker["count"]
    loss_rate = max(0.0, (dropped / total_expected) * 100.0)
    return round(loss_rate, 2)


def migrate_existing_csvs():
    """
    Ensures existing CSV files in the log directory are upgraded to the 
    new 15-column schema, filling in logical default values for older rows
    and resolving any mismatched column lines robustly.
    """
    if not os.path.exists(LOG_DIR):
        logger.info("Log directory does not exist yet. Skipping CSV migration.")
        return
        
    logger.info("Scanning for pre-existing CSV log files to migrate...")
    for filename in os.listdir(LOG_DIR):
        if filename.endswith("_history.csv"):
            file_path = os.path.join(LOG_DIR, filename)
            try:
                import csv
                
                rows_list = []
                headers = []
                with open(file_path, 'r', newline='', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    try:
                        headers = next(reader)
                    except StopIteration:
                        # Empty file
                        continue
                    
                    for row in reader:
                        rows_list.append(row)
                
                # Check if we need migration (either headers differ, or rows contain extra elements)
                needs_migration = (headers != STANDARD_COLUMNS)
                if not needs_migration:
                    # Double-check if any row is longer/shorter than expected
                    for row in rows_list:
                        if len(row) != len(STANDARD_COLUMNS):
                            needs_migration = True
                            break
                
                if needs_migration:
                    new_rows = []
                    for row in rows_list:
                        row_dict = {}
                        for i, col in enumerate(headers):
                            if i < len(row):
                                row_dict[col] = row[i]
                                
                        # Handle extra values that might have been written to the row
                        if len(row) > len(headers):
                            extra_vals = row[len(headers):]
                            missing_cols = [c for c in STANDARD_COLUMNS if c not in headers]
                            for idx, col_name in enumerate(missing_cols):
                                if idx < len(extra_vals):
                                    row_dict[col_name] = extra_vals[idx]
                        
                        # Populate standardized row with defaults
                        standard_row = {}
                        for col in STANDARD_COLUMNS:
                            if col in row_dict and row_dict[col] not in (None, "", "None", "NaN", "nan"):
                                standard_row[col] = row_dict[col]
                            else:
                                if col == "battery_level":
                                    standard_row[col] = 100.0
                                elif col == "signal_strength":
                                    standard_row[col] = -60.0
                                elif col == "latency_ms":
                                    standard_row[col] = 0.0
                                elif col == "packet_loss_rate":
                                    standard_row[col] = 0.0
                                elif col == "seq_num":
                                    standard_row[col] = 0
                                else:
                                    standard_row[col] = ""
                        new_rows.append(standard_row)
                    
                    # Write back standard file
                    with open(file_path, 'w', newline='', encoding='utf-8') as f:
                        writer = csv.DictWriter(f, fieldnames=STANDARD_COLUMNS)
                        writer.writeheader()
                        writer.writerows(new_rows)
                        
                    logger.info(f"Successfully migrated schema of {filename}")
            except Exception as e:
                logger.error(f"Error migrating file {filename}: {e}")

def flatten_payload(payload):
    """Converts nested metrics into a flat dictionary for CSV/DataFrames."""
    flat = {
        "timestamp": time.ctime(payload['ts']), # Human readable for CSV
        "unix_ts": payload['ts'],              # Machine readable for ML
        "node_id": payload['node_id'],
        "condition": payload.get('condition', 'N/A')
    }
    # Merge the metrics dictionary into the top level
    flat.update(payload.get('metrics', {}))
    return flat

def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        logger.info(f"Connected to MQTT Broker successfully. Subscribing to: {TOPIC_FILTER}")
        client.subscribe(TOPIC_FILTER)
    else:
        logger.error(f"MQTT connection failed with reason code: {reason_code}")

def on_message(client, userdata, msg):
    try:
        topic_parts = msg.topic.split('/')
        node_id = topic_parts[-2]
        msg_type = topic_parts[-1]
        
        from src.utils.node_registry import resolve_node_id, update_node_last_seen
        city = resolve_node_id(node_id)
        update_node_last_seen(node_id, time.time())
        
        payload = json.loads(msg.payload.decode())

        if msg_type == "status":
            node_health[city] = time.time()
            seq_num = payload.get("seq_num")
            if seq_num is not None:
                update_packet_loss(city, seq_num)
            
            # Update Digital Twin from heartbeat
            try:
                twin_manager.update_twin(node_id, city, payload, msg_type="status")
            except Exception as te:
                logger.debug(f"[DigitalTwin] Failed to update twin on status: {te}")
            
            # Check for offline resolution
            if city in fault_detector.active_alerts and fault_detector.active_alerts[city].get("OFFLINE") == "CRITICAL":
                alert = fault_detector._create_alert(city, "OFFLINE", "RESOLVED", "Node is back ONLINE", 0.0)
                fault_detector.active_alerts[city]["OFFLINE"] = None
                log_alert(alert)
            logger.debug(f"[STATUS] Received heartbeat from {city}.")

        elif msg_type == "data":
            flat_data = flatten_payload(payload)
            
            # Extract and update packet loss metric
            seq_num = payload.get("seq_num")
            if seq_num is not None:
                flat_data["packet_loss_rate"] = update_packet_loss(city, seq_num)
            else:
                flat_data["packet_loss_rate"] = 0.0
                
            logger.info(
                f"[DATA] Received from {city}: {flat_data.get('temp')}°C, {flat_data.get('condition')}, "
                f"Battery: {flat_data.get('battery_level')}%, Signal: {flat_data.get('signal_strength')} dBm, "
                f"Latency: {flat_data.get('latency_ms')} ms, Loss: {flat_data.get('packet_loss_rate')}%"
            )
            
            # Run fault checks
            alerts = fault_detector.check_telemetry(city, flat_data)
            for alert in alerts:
                log_alert(alert)
            
            # 1. Update In-Memory Buffer
            if city not in live_data_buffer:
                live_data_buffer[city] = deque(maxlen=50)
            live_data_buffer[city].append(flat_data)
            
            # 2. Update Digital Twin
            try:
                twin_manager.update_twin(node_id, city, flat_data, msg_type="data")
            except Exception as te:
                logger.debug(f"[DigitalTwin] Failed to update twin on data: {te}")
            
            # 3. Log to City-Specific CSV
            save_to_csv(city, flat_data)
            
            # 4. Log to Unified Processed Dataset
            save_to_processed_dataset(city, flat_data)

    except Exception as e:
        logger.error(f"Backend failed to process message: {e}")

def save_to_csv(city, data):
    """
    Ensures the log directory exists, creates a city-specific CSV if missing,
    aligns the column values to STANDARD_COLUMNS, and appends the row.
    """
    os.makedirs(LOG_DIR, exist_ok=True)
    file_path = os.path.join(LOG_DIR, f"{city}_history.csv")
    file_exists = os.path.isfile(file_path)
    
    # Create the DataFrame from the current reading
    df = pd.DataFrame([data])
    
    # Align DataFrame columns to STANDARD_COLUMNS (filling missing columns with None)
    for col in STANDARD_COLUMNS:
        if col not in df.columns:
            df[col] = None
    df = df[STANDARD_COLUMNS]
    
    # Write to CSV
    df.to_csv(
        file_path, 
        mode='a', 
        index=False, 
        header=not file_exists, 
        encoding='utf-8'
    )

def save_to_processed_dataset(city, data):
    """
    Appends the telemetry record to the unified processed dataset (wsn_dataset.csv),
    ensuring it is aligned to the unified dataset columns.
    """
    processed_dir = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
    os.makedirs(processed_dir, exist_ok=True)
    file_path = os.path.join(processed_dir, "wsn_dataset.csv")
    file_exists = os.path.isfile(file_path)
    
    # Copy data dictionary to avoid modifying original
    dataset_row = data.copy()
    dataset_row["city"] = city
    dataset_row["anomaly_flag"] = 0 # Default to 0 (normal) for streaming data
    
    # Dynamically read header if file exists to support ML scoring columns
    if file_exists:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                dataset_columns = f.readline().strip().split(",")
        except Exception:
            dataset_columns = STANDARD_COLUMNS + ["city", "anomaly_flag"]
    else:
        dataset_columns = STANDARD_COLUMNS + ["city", "anomaly_flag"]
    
    df = pd.DataFrame([dataset_row])
    for col in dataset_columns:
        if col not in df.columns:
            df[col] = None
    df = df[dataset_columns]
    
    df.to_csv(
        file_path, 
        mode='a', 
        index=False, 
        header=not file_exists, 
        encoding='utf-8'
    )


def monitor_health():
    """Watchdog logic to check for silent nodes and mark offline twins."""
    now = time.time()
    alerts = fault_detector.check_node_timeouts(node_health, now)
    for alert in alerts:
        log_alert(alert)
        # Keep Digital Twin status in sync with watchdog decisions
        if alert.get("alert_type") == "OFFLINE" and alert.get("severity") == "CRITICAL":
            try:
                twin_manager.mark_offline(alert["node_id"])
            except Exception as te:
                logger.debug(f"[DigitalTwin] Failed to mark offline: {te}")

def start_backend():
    # Perform startup schema migration for existing logs
    migrate_existing_csvs()

    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(BROKER, PORT, 60)
        
        # loop_start runs the MQTT processing in a background thread
        client.loop_start()
        logger.info("--- Backend Processor & Watchdog Online ---")
        
        while True:
            monitor_health()
            time.sleep(10) # Check health every 10 seconds
            
    except KeyboardInterrupt:
        logger.info("Shutting down backend...")
        client.disconnect()
    except Exception as e:
        logger.critical(f"Critical Backend Error: {e}")

if __name__ == "__main__":
    start_backend()