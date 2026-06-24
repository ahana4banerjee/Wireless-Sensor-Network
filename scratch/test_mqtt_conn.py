import paho.mqtt.client as mqtt
import time
import sys

print("Connecting to broker.hivemq.com:1883...")
client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)

def on_connect(client, userdata, flags, rc, properties=None):
    print(f"Connected with result code {rc}")
    client.disconnect()
    sys.exit(0)

client.on_connect = on_connect

try:
    client.connect("broker.hivemq.com", 1883, 60)
    client.loop_start()
    time.sleep(5)
    print("Failed to connect within 5 seconds.")
    client.loop_stop()
except Exception as e:
    print(f"Error: {e}")
