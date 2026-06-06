import paho.mqtt.client as mqtt
import json
import pandas as pd
import time
import os
from collections import deque
import logging
from logging.handlers import RotatingFileHandler

# --- Configuration ---
BROKER = "localhost"
PORT = 1883
TOPIC_FILTER = "wsn/+/+"  # Subscribe to all cities and all message types
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
    loss_rate = (dropped / total_expected) * 100.0
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

def on_message(client, userdata, msg):
    try:
        topic_parts = msg.topic.split('/')
        city = topic_parts[1]
        msg_type = topic_parts[2]
        payload = json.loads(msg.payload.decode())

        if msg_type == "status":
            node_health[city] = time.time()
            seq_num = payload.get("seq_num")
            if seq_num is not None:
                update_packet_loss(city, seq_num)
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
            
            # 1. Update In-Memory Buffer
            if city not in live_data_buffer:
                live_data_buffer[city] = deque(maxlen=50)
            live_data_buffer[city].append(flat_data)
            
            # 2. Log to City-Specific CSV
            save_to_csv(city, flat_data)

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

def monitor_health():
    """Watchdog logic to check for silent nodes."""
    now = time.time()
    for city, last_seen in list(node_health.items()):
        if now - last_seen > HEALTH_THRESHOLD:
            logger.warning(f"!!! [ALERT] Node {city} has timed out. Potential Fault Detected.")

def start_backend():
    # Perform startup schema migration for existing logs
    migrate_existing_csvs()

    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    
    try:
        client.connect(BROKER, PORT, 60)
        client.subscribe(TOPIC_FILTER)
        
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