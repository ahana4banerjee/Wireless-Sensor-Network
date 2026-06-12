import urllib.request
import urllib.error
import json

base_url = "http://127.0.0.1:8000/api/settings"

def get_settings():
    print("Testing GET /api/settings...")
    with urllib.request.urlopen(base_url) as response:
        code = response.getcode()
        body = response.read().decode('utf-8')
        print(f"Status: {code}")
        return json.loads(body)

def update_settings(payload):
    print("Testing POST /api/settings...")
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        base_url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as response:
            code = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Status: {code}")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"HTTPError: {e.code} - {body}")
        return e.code, body

# 1. Fetch current settings
config = get_settings()
print(json.dumps(config, indent=2))

# 2. Test positive update (valid bounds)
valid_payload = {
    "data_interval": 30,
    "heartbeat_interval": 10,
    "packet_loss_rate": 0.02,
    "max_delay_ms": 2000,
    "battery_discharge_heartbeat": 0.05,
    "battery_discharge_data": 0.2,
    "battery_discharge_idle": 0.005,
    "rssi_baseline": -55.0,
    "rssi_noise": 2.5,
    "polling_interval": 5
}
update_res = update_settings(valid_payload)
print("Updated config:")
print(json.dumps(update_res, indent=2))

# 3. Test negative update (out of bounds: data_interval=2, packet_loss_rate=1.5)
invalid_payload = valid_payload.copy()
invalid_payload["data_interval"] = 2
invalid_payload["packet_loss_rate"] = 1.5

print("Updating with invalid payload...")
update_settings(invalid_payload)

# 4. Restore original config
print("Restoring original config...")
original_payload = config["simulation"]
update_settings(original_payload)
