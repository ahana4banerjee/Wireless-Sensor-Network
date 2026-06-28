import os
import time
import json
import logging
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("WSN_ForecastEngine")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
REGISTRY_PATH = os.path.join(MODELS_DIR, "registry.json")
LOG_DIR = os.path.join(PROJECT_ROOT, "data", "logs")

# Constants
DEFAULT_DECAY_RATES = {
    "Bangalore": 0.15,
    "Hyderabad": 0.20,
    "Mumbai": 0.25,
    "Delhi": 0.30,
    "Secunderabad": 0.35,
    "Unknown": 0.25
}

class ForecastEngine:
    def __init__(self):
        self.models = {}
        self.registry = {}
        self._load_registry()
        self._load_models()

    def _load_registry(self):
        if os.path.exists(REGISTRY_PATH):
            try:
                with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                    self.registry = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load registry: {e}")

    def _load_models(self):
        model_keys = ["temp_model", "humidity_model", "latency_model", "packet_loss_model"]
        for key in model_keys:
            model_path = os.path.join(MODELS_DIR, f"{key}.pkl")
            if os.path.exists(model_path):
                try:
                    self.models[key] = joblib.load(model_path)
                    logger.info(f"Loaded model {key} successfully.")
                except Exception as e:
                    logger.error(f"Error loading model {key}: {e}")
            else:
                logger.warning(f"Model path {model_path} does not exist.")

    def get_model_rmse(self, model_key, default_rmse):
        """Retrieves validation RMSE from the registry, falling back to a sensible default."""
        try:
            if model_key in self.registry:
                history = self.registry[model_key].get("history", [])
                if history:
                    # Sort history by created_time desc to get the latest
                    history_sorted = sorted(history, key=lambda x: x.get("created_time", ""), reverse=True)
                    rmse = history_sorted[0].get("metrics", {}).get("RMSE")
                    if rmse is not None and rmse > 0:
                        return float(rmse)
        except Exception:
            pass
        return default_rmse

    def compute_nhi(self, battery, signal, latency, loss):
        """Computes Network Health Index score (0-100) based on normalized parameters."""
        battery_norm = min(max(float(battery), 0.0), 100.0)
        signal_norm = min(max((float(signal) + 100.0) / 70.0 * 100.0, 0.0), 100.0)
        latency_norm = min(max((1500.0 - float(latency)) / 1500.0 * 100.0, 0.0), 100.0)
        loss_norm = min(max(100.0 - float(loss), 0.0), 100.0)
        
        health_score = 0.35 * battery_norm + 0.25 * signal_norm + 0.20 * latency_norm + 0.20 * loss_norm
        return round(min(max(health_score, 0.0), 100.0), 2)

    def calculate_nhi_status(self, score):
        if score >= 90.0:
            return "EXCELLENT"
        elif score >= 75.0:
            return "GOOD"
        elif score >= 60.0:
            return "WARNING"
        elif score >= 40.0:
            return "CRITICAL"
        else:
            return "FAILING"

    def estimate_rssi_slope(self, city):
        """Estimates RSSI hourly slope (trend) from the last 10 historical readings."""
        history_path = os.path.join(LOG_DIR, f"{city}_history.csv")
        if not os.path.exists(history_path):
            return 0.0
            
        try:
            df = pd.read_csv(history_path)
            if len(df) < 5:
                return 0.0
            
            # Take last 10 readings
            recent = df.tail(10).copy()
            if "unix_ts" not in recent.columns or "signal_strength" not in recent.columns:
                return 0.0
                
            x = (recent["unix_ts"] - recent["unix_ts"].iloc[0]) / 3600.0  # Hours elapsed
            y = recent["signal_strength"]
            
            # Simple linear regression slope
            slope, _ = np.polyfit(x, y, 1)
            # Only return negative slope if it is significant (e.g. drops by > 0.05 dBm/hour)
            if slope < -0.05:
                return slope
        except Exception:
            pass
        return 0.0

    def generate_forecast(self, city, latest_data, hours_horizon=72, step_hours=3):
        """Generates rolling future forecasts and actionable insights for a single node."""
        # 1. Starting states
        current_temp = float(latest_data.get("temp", 28.0))
        current_hum = float(latest_data.get("humidity", 55.0))
        current_press = float(latest_data.get("pressure", 1012.0))
        current_wind = float(latest_data.get("wind_speed", 3.0))
        
        current_battery = float(latest_data.get("battery_level", 95.0))
        current_signal = float(latest_data.get("signal_strength", -60.0))
        current_latency = float(latest_data.get("latency_ms", 120.0))
        current_loss = float(latest_data.get("packet_loss_rate", 1.0))
        
        raw_ts = latest_data.get("unix_ts", time.time())
        base_time = datetime.fromtimestamp(raw_ts, tz=timezone.utc)
        
        # 2. Get trends & parameters
        decay_rate = DEFAULT_DECAY_RATES.get(city, DEFAULT_DECAY_RATES["Unknown"])
        rssi_slope = self.estimate_rssi_slope(city)
        
        # 3. Pull RMSE confidence bands
        temp_rmse = self.get_model_rmse("temp_model", 1.48)
        hum_rmse = self.get_model_rmse("humidity_model", 10.56)
        lat_rmse = self.get_model_rmse("latency_model", 282.3)
        loss_rmse = self.get_model_rmse("packet_loss_model", 2.53)
        
        # 4. Generate rolling forecast timeline
        timeline = []
        steps = int(hours_horizon / step_hours) + 1
        
        for step in range(steps):
            h_offset = step * step_hours
            future_dt = base_time + timedelta(hours=h_offset)
            
            # Time features
            hour = future_dt.hour
            day = future_dt.day
            month = future_dt.month
            
            # Predict Environment
            # Temp predicts using previous humidity, Humidity predicts using predicted temp
            if "temp_model" in self.models and "humidity_model" in self.models:
                try:
                    # Model features: pressure, wind_speed, humidity, hour, day, month
                    pred_temp = self.models["temp_model"].predict([[current_press, current_wind, current_hum, hour, day, month]])[0]
                    # Model features: pressure, wind_speed, temp, hour, day, month
                    pred_hum = self.models["humidity_model"].predict([[current_press, current_wind, pred_temp, hour, day, month]])[0]
                    
                    # Bound values physically
                    current_temp = float(np.clip(pred_temp, -10.0, 50.0))
                    current_hum = float(np.clip(pred_hum, 5.0, 100.0))
                except Exception as e:
                    # Fallback to diurnal variation if inference fails
                    diurnal = np.sin((hour - 6) / 24.0 * 2 * np.pi) * 4.0
                    current_temp = current_temp + diurnal
                    current_hum = current_hum - diurnal * 2.0
            else:
                # Fallback diurnal variation
                diurnal = np.sin((hour - 6) / 24.0 * 2 * np.pi) * 4.0
                current_temp = current_temp + diurnal
                current_hum = current_hum - diurnal * 2.0
            
            # Classify condition based on weather rules
            if current_press < 1008.0:
                condition = "Rain"
            elif current_hum > 75.0:
                condition = "Clouds"
            else:
                condition = "Clear"
                
            # Predict Network
            # Battery decays linearly over time
            pred_battery = max(0.0, current_battery - decay_rate * h_offset)
            
            # RSSI trend linear extrapolation
            pred_signal = current_signal + rssi_slope * h_offset
            pred_signal = max(-100.0, min(-30.0, pred_signal))
            
            # Latency and Packet Loss predicted using models
            if "latency_model" in self.models and "packet_loss_model" in self.models:
                try:
                    # features: signal_strength, packet_loss_rate, battery_level
                    pred_lat = self.models["latency_model"].predict([[pred_signal, current_loss, pred_battery]])[0]
                    # features: signal_strength, battery_level, latency_ms
                    pred_loss = self.models["packet_loss_model"].predict([[pred_signal, pred_battery, pred_lat]])[0]
                    
                    current_latency = float(np.clip(pred_lat, 10.0, 1500.0))
                    current_loss = float(np.clip(pred_loss, 0.0, 100.0))
                except Exception:
                    pass
            
            # Compute Health Score
            health_score = self.compute_nhi(pred_battery, pred_signal, current_latency, current_loss)
            health_status = self.calculate_nhi_status(health_score)
            
            # Calculate Risk Level for this step
            step_risk = "NORMAL"
            if pred_battery < 10.0 or current_latency > 1300.0 or current_loss > 30.0 or health_score < 40.0:
                step_risk = "CRITICAL"
            elif pred_battery < 20.0 or current_latency > 1000.0 or current_loss > 15.0 or health_score < 60.0:
                step_risk = "HIGH"
            elif pred_battery < 35.0 or current_latency > 500.0 or current_loss > 5.0 or health_score < 75.0:
                step_risk = "MEDIUM"
            elif current_hum > 90.0:
                step_risk = "LOW"
                
            timeline.append({
                "time_offset_h": h_offset,
                "timestamp": future_dt.isoformat(),
                "time_label": f"+{h_offset}h" if h_offset > 0 else "Now",
                "temperature": round(current_temp, 2),
                "humidity": round(current_hum, 2),
                "pressure": round(current_press, 2),
                "condition": condition,
                "battery_level": round(pred_battery, 2),
                "signal_strength": round(pred_signal, 2),
                "latency_ms": round(current_latency, 2),
                "packet_loss_rate": round(current_loss, 2),
                "health_score": health_score,
                "health_status": health_status,
                "risk_level": step_risk
            })
            
        # 5. Generate Actionable Operational Insights (Deterministic & Explainable)
        insights = []
        overall_risk = "NORMAL"
        
        # Rule 1: Battery maintenance warning
        low_bat_step = next((t for t in timeline if t["battery_level"] < 20.0), None)
        if low_bat_step:
            hours = low_bat_step["time_offset_h"]
            insights.append({
                "type": "BATTERY_LOW",
                "severity": "CRITICAL" if hours < 12 else "HIGH",
                "message": f"Battery predicted to fall below 20% within {hours} hours (at {low_bat_step['battery_level']}%).",
                "recommendation": "Recommend maintenance and scheduling battery replacement within the next 24 hours."
            })
            
        # Rule 2: High latency / packet loss check
        high_loss_step = next((t for t in timeline if t["packet_loss_rate"] > 15.0), None)
        if high_loss_step:
            insights.append({
                "type": "PACKET_LOSS_HIGH",
                "severity": "HIGH",
                "message": f"Packet loss rate is expected to exceed operational threshold ({high_loss_step['packet_loss_rate']}%).",
                "recommendation": "Inspect gateway connectivity, check RF interference, or realign directional antennas."
            })
            
        # Rule 3: Steady RSSI degradation
        if rssi_slope < -0.10:
            final_rssi = timeline[-1]["signal_strength"]
            insights.append({
                "type": "RSSI_DEGRADING",
                "severity": "MEDIUM" if final_rssi > -80 else "HIGH",
                "message": f"RSSI is degrading steadily at a rate of {abs(rssi_slope):.3f} dBm/hour (forecasted to reach {final_rssi} dBm).",
                "recommendation": "Check for antenna loosening, new structural physical barriers, or high environmental interference."
            })
            
        # Rule 4: Weather hazard (Humidity > 90%)
        high_hum_step = next((t for t in timeline if t["humidity"] > 90.0), None)
        if high_hum_step:
            insights.append({
                "type": "WEATHER_RAIN_RISK",
                "severity": "LOW",
                "message": f"Humidity forecast peaks above 90% ({high_hum_step['humidity']}%). Rain is highly likely.",
                "recommendation": "Reduced sensor optical visibility expected. Auto-calibration filters activated."
            })
            
        # Rule 5: Network Health Score transition
        current_nhi = timeline[0]["health_score"]
        current_status = timeline[0]["health_status"]
        future_degrade = next((t for t in timeline if t["health_score"] < 60.0), None)
        if future_degrade and current_nhi >= 75.0:
            hours = future_degrade["time_offset_h"]
            insights.append({
                "type": "HEALTH_DEGRADATION",
                "severity": "HIGH",
                "message": f"Network Health Index predicted to transition from {current_status} to {future_degrade['health_status']} within {hours} hours.",
                "recommendation": "Recommend remote node diagnostic inspect to head off hardware network failure."
            })
            
        # 6. Overall Node Risk Level
        risk_priorities = {"NORMAL": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
        max_priority = 0
        for t in timeline:
            max_priority = max(max_priority, risk_priorities[t["risk_level"]])
        for ins in insights:
            max_priority = max(max_priority, risk_priorities.get(ins["severity"], 0))
            
        inverse_priorities = {0: "NORMAL", 1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"}
        overall_risk = inverse_priorities[max_priority]
        
        # 7. Confidence Bands Response Structure
        confidence = {
            "temperature": f"± {round(1.96 * temp_rmse, 1)}°C",
            "humidity": f"± {round(1.96 * hum_rmse, 1)}%",
            "latency": f"± {round(1.96 * lat_rmse, 1)}ms",
            "packet_loss": f"± {round(1.96 * loss_rmse, 1)}%"
        }
        
        return {
            "city": city,
            "forecast_horizon_h": hours_horizon,
            "step_hours": step_hours,
            "overall_risk_level": overall_risk,
            "confidence_prediction_intervals": confidence,
            "timeline": timeline,
            "operational_insights": insights
        }

forecast_engine = ForecastEngine()
