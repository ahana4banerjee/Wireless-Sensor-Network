import serial
import paho.mqtt.client as mqtt
import json
import sys
import time

# --- Configurations ---
SERIAL_PORT = "COM4"  # Matches PICSimLab serial port
BAUD_RATE = 115200
MQTT_BROKER = "127.0.0.1"  # Localhost is fine because this script runs on the host PC!
MQTT_PORT = 1883

print("==================================================")
print("     WSN IoT Gateway Serial-to-MQTT Bridge        ")
print("==================================================")

# Connect to MQTT Broker
mqtt_client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    print(f"[MQTT] Connected successfully to broker at {MQTT_BROKER}:{MQTT_PORT}")
    mqtt_client.loop_start()
except Exception as e:
    print(f"[MQTT ERROR] Failed to connect to broker: {e}")
    sys.exit(1)

# Connect to Serial Port
try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    print(f"[SERIAL] Connected to {SERIAL_PORT} at {BAUD_RATE} baud.")
except Exception as e:
    print(f"[SERIAL ERROR] Failed to open port {SERIAL_PORT}: {e}")
    print("Ensure PICSimLab is configured to COM4 and no other terminal monitor is using it.")
    sys.exit(1)

print("\nListening for virtual ESP32 telemetry over Serial...\n")

try:
    while True:
        if ser.in_waiting > 0:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue
                
            print(f"[Incoming Serial] {line}")
            
            # Check if line matches our gateway publish format:
            # FORMAT: PUBLISH|wsn/city/topic|{json_payload}
            if line.startswith("PUBLISH|"):
                parts = line.split("|", 2)
                if len(parts) == 3:
                    _, topic, payload_str = parts
                    
                    # Validate JSON structure
                    try:
                        payload_json = json.loads(payload_str)
                        # Publish directly to local broker
                        mqtt_client.publish(topic, json.dumps(payload_json))
                        print(f"  └─► [MQTT PUBLISHED] Topic: {topic} | Seq: {payload_json.get('seq_num')}")
                    except json.JSONDecodeError:
                        print("  └─► [JSON ERROR] Payload string is not valid JSON.")
                    except Exception as e:
                        print(f"  └─► [ERROR] Failed to publish message: {e}")
except KeyboardInterrupt:
    print("\nShutting down Gateway Serial Bridge...")
finally:
    ser.close()
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    print("Bridge connection closed.")
