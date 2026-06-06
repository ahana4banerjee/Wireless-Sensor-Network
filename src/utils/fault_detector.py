import time
import logging

logger = logging.getLogger("WSN_Backend")

class FaultDetector:
    def __init__(self, settings=None):
        self.settings = settings or {}
        
        # Load thresholds with safe fallbacks
        self.battery_low = 15.0
        self.battery_critical = 5.0
        self.rssi_weak = -85.0
        self.rssi_critical = -95.0
        self.latency_high = 1000.0
        self.latency_critical = 1500.0
        self.packet_loss_high = 10.0
        self.packet_loss_critical = 25.0
        self.offline_timeout = 45.0

        # Keep track of active alert states to prevent duplicates
        # Structure: { city: { alert_type: severity } }
        self.active_alerts = {}

    def _create_alert(self, city, alert_type, severity, message, value, timestamp=None, unix_ts=None):
        ts = unix_ts or time.time()
        time_str = timestamp or time.ctime(ts)
        return {
            "timestamp": time_str,
            "unix_ts": ts,
            "node_id": city,
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "value": value
        }

    def check_telemetry(self, city, flat_data):
        """
        Evaluates flattened incoming telemetry data from a node for metrics faults.
        Returns a list of structured alert dicts.
        """
        alerts = []
        if city not in self.active_alerts:
            self.active_alerts[city] = {}
        
        current_alerts = self.active_alerts[city]
        unix_ts = flat_data.get("unix_ts", time.time())
        time_str = flat_data.get("timestamp", time.ctime(unix_ts))

        # 1. Check Battery Level
        battery = flat_data.get("battery_level")
        if battery is not None:
            battery = float(battery)
            target_severity = None
            if battery <= self.battery_critical:
                target_severity = "CRITICAL"
            elif battery <= self.battery_low:
                target_severity = "WARNING"
            
            active_severity = current_alerts.get("BATTERY")
            if target_severity:
                if active_severity != target_severity:
                    msg = f"Battery level is dangerously low: {battery}%"
                    alerts.append(self._create_alert(city, "BATTERY", target_severity, msg, battery, time_str, unix_ts))
                    current_alerts["BATTERY"] = target_severity
            else:
                if active_severity:
                    # Battery recovered (e.g. node reset/rebooted)
                    msg = f"Battery level recovered to {battery}%"
                    alerts.append(self._create_alert(city, "BATTERY", "RESOLVED", msg, battery, time_str, unix_ts))
                    current_alerts["BATTERY"] = None

        # 2. Check Signal Strength (RSSI)
        rssi = flat_data.get("signal_strength")
        if rssi is not None:
            rssi = float(rssi)
            target_severity = None
            if rssi <= self.rssi_critical:
                target_severity = "CRITICAL"
            elif rssi <= self.rssi_weak:
                target_severity = "WARNING"
                
            active_severity = current_alerts.get("SIGNAL_STRENGTH")
            if target_severity:
                if active_severity != target_severity:
                    msg = f"Signal strength is weak: {rssi} dBm"
                    alerts.append(self._create_alert(city, "SIGNAL_STRENGTH", target_severity, msg, rssi, time_str, unix_ts))
                    current_alerts["SIGNAL_STRENGTH"] = target_severity
            else:
                if active_severity:
                    msg = f"Signal strength recovered to {rssi} dBm"
                    alerts.append(self._create_alert(city, "SIGNAL_STRENGTH", "RESOLVED", msg, rssi, time_str, unix_ts))
                    current_alerts["SIGNAL_STRENGTH"] = None

        # 3. Check Latency
        latency = flat_data.get("latency_ms")
        if latency is not None:
            latency = float(latency)
            target_severity = None
            if latency >= self.latency_critical:
                target_severity = "CRITICAL"
            elif latency >= self.latency_high:
                target_severity = "WARNING"
                
            active_severity = current_alerts.get("LATENCY")
            if target_severity:
                if active_severity != target_severity:
                    msg = f"Transmission latency is high: {latency} ms"
                    alerts.append(self._create_alert(city, "LATENCY", target_severity, msg, latency, time_str, unix_ts))
                    current_alerts["LATENCY"] = target_severity
            else:
                if active_severity:
                    msg = f"Transmission latency recovered to {latency} ms"
                    alerts.append(self._create_alert(city, "LATENCY", "RESOLVED", msg, latency, time_str, unix_ts))
                    current_alerts["LATENCY"] = None

        # 4. Check Packet Loss Rate
        loss = flat_data.get("packet_loss_rate")
        if loss is not None:
            loss = float(loss)
            target_severity = None
            if loss >= self.packet_loss_critical:
                target_severity = "CRITICAL"
            elif loss >= self.packet_loss_high:
                target_severity = "WARNING"
                
            active_severity = current_alerts.get("PACKET_LOSS")
            if target_severity:
                if active_severity != target_severity:
                    msg = f"Packet loss rate is high: {loss}%"
                    alerts.append(self._create_alert(city, "PACKET_LOSS", target_severity, msg, loss, time_str, unix_ts))
                    current_alerts["PACKET_LOSS"] = target_severity
            else:
                if active_severity:
                    msg = f"Packet loss rate recovered to {loss}%"
                    alerts.append(self._create_alert(city, "PACKET_LOSS", "RESOLVED", msg, loss, time_str, unix_ts))
                    current_alerts["PACKET_LOSS"] = None

        # If a node is sending data, it is ONLINE. Resolve OFFLINE alert if active
        if current_alerts.get("OFFLINE") == "CRITICAL":
            msg = "Node is back ONLINE"
            alerts.append(self._create_alert(city, "OFFLINE", "RESOLVED", msg, 0.0, time_str, unix_ts))
            current_alerts["OFFLINE"] = None

        return alerts

    def check_node_timeouts(self, node_health_dict, current_time):
        """
        Scans all nodes for watchdog heartbeat timeouts.
        Returns a list of structured alert dicts.
        """
        alerts = []
        for city, last_seen in list(node_health_dict.items()):
            if city not in self.active_alerts:
                self.active_alerts[city] = {}
                
            current_alerts = self.active_alerts[city]
            elapsed = current_time - last_seen
            
            if elapsed > self.offline_timeout:
                if current_alerts.get("OFFLINE") != "CRITICAL":
                    msg = f"Node heartbeat timeout. Offline for {round(elapsed, 1)} seconds."
                    alerts.append(self._create_alert(city, "OFFLINE", "CRITICAL", msg, round(elapsed, 1), unix_ts=current_time))
                    current_alerts["OFFLINE"] = "CRITICAL"
            else:
                if current_alerts.get("OFFLINE") == "CRITICAL":
                    msg = "Node is back ONLINE"
                    alerts.append(self._create_alert(city, "OFFLINE", "RESOLVED", msg, round(elapsed, 1), unix_ts=current_time))
                    current_alerts["OFFLINE"] = None
                    
        return alerts
