import paho.mqtt.client as mqtt
import json
import time
import sys

# Connect to the public broker
broker = "broker.hivemq.com"
port = 1883
topic_prefix = "wsn_ahana_2026"
node_mac = "24:0a:c4:08:32:01" # maps to Bangalore

print(f"Connecting to {broker}:{port}...")
client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
client.connect(broker, port, 60)
client.loop_start()

# 1. Publish status packet (Sequence 1)
time.sleep(1)
precise_ts = time.time() - 0.045 # Simulate 45ms latency
status_payload = {
    "node_id": node_mac,
    "city": node_mac,
    "status": "ONLINE",
    "timestamp": precise_ts,
    "ts": precise_ts,
    "seq_num": 1,
    "metrics": {
        "battery_level": 98.50,
        "signal_strength": -65.0,
        "latency_ms": 0.0, # Will be calculated by backend
        "seq_num": 1
    }
}
topic_status = f"{topic_prefix}/{node_mac}/status"
print(f"Publishing Status to {topic_status} with simulated latency of 45ms...")
client.publish(topic_status, json.dumps(status_payload))

# 2. Publish data packet (Sequence 2)
time.sleep(1)
precise_ts = time.time() - 0.082 # Simulate 82ms latency
data_payload = {
    "node_id": node_mac,
    "city": node_mac,
    "timestamp": precise_ts,
    "ts": precise_ts,
    "seq_num": 2,
    "condition": "Clear",
    "temperature": 27.5,
    "humidity": 55.0,
    "pressure": 1012.0,
    "battery_level": 98.0,
    "signal_strength": -64.0,
    "latency_ms": 0.0,
    "metrics": {
        "temp": 27.5,
        "feels_like": 28.5,
        "humidity": 55.0,
        "pressure": 1012.0,
        "wind_speed": 4.5,
        "visibility": 9500.0,
        "battery_level": 98.0,
        "signal_strength": -64.0,
        "latency_ms": 0.0,
        "seq_num": 2
    }
}
topic_data = f"{topic_prefix}/{node_mac}/data"
print(f"Publishing Data to {topic_data} with simulated latency of 82ms...")
client.publish(topic_data, json.dumps(data_payload))

# 3. Publish data packet with a gap in sequence number (Sequence 4 instead of 3 - simulating a loss of 1 packet)
time.sleep(1)
precise_ts = time.time() - 0.060 # Simulate 60ms latency
data_payload["seq_num"] = 4
data_payload["metrics"]["seq_num"] = 4
data_payload["timestamp"] = precise_ts
data_payload["ts"] = precise_ts
print(f"Publishing Data with sequence gap (Seq 4) to {topic_data}...")
client.publish(topic_data, json.dumps(data_payload))

time.sleep(2)
client.loop_stop()
client.disconnect()
print("Publish test finished.")
