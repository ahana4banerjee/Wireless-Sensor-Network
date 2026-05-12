import paho.mqtt.client as mqtt
import json
import pandas as pd
import os

BROKER = "localhost"
TOPIC = "wsn/sensors/data"
DATA_FILE = "../../data/sensor_log.csv"

# Ensure data directory exists
os.makedirs("../../data", exist_ok=True)

def on_message(client, userdata, msg):
    """Callback triggered when a message is received."""
    try:
        # Decode the JSON payload
        payload = json.loads(msg.payload.decode())
        print(f"Received Data: {payload}")

        # Convert to DataFrame for easy CSV handling
        df = pd.DataFrame([payload])
        
        # Append to CSV (create if it doesn't exist)
        if not os.path.isfile(DATA_FILE):
            df.to_csv(DATA_FILE, index=False)
        else:
            df.to_csv(DATA_FILE, mode='a', header=False, index=False)
            
    except Exception as e:
        print(f"Error processing message: {e}")

def start_backend():
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    
    client.connect(BROKER, 1883, 60)
    client.subscribe(TOPIC)
    
    print("Backend Subscriber is running. Waiting for data...")
    client.loop_forever()

if __name__ == "__main__":
    start_backend()