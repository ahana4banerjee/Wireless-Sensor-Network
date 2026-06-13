from pydantic import BaseModel
from typing import List, Optional, Dict

class HealthResponse(BaseModel):
    status: str
    service: str

class RootResponse(BaseModel):
    project: str
    version: str

class NodeHealth(BaseModel):
    node_id: str
    status: str
    battery_level: float
    signal_strength: float

class NodesResponse(BaseModel):
    total_nodes: int
    nodes: List[NodeHealth]

class TelemetryRecord(BaseModel):
    city: str
    temp: float
    humidity: float
    pressure: float
    wind_speed: float
    battery_level: float
    signal_strength: float
    latency_ms: float
    packet_loss_rate: float
    timestamp: str

class AnomalyRecord(BaseModel):
    timestamp: str
    unix_ts: float
    node_id: str
    condition: str
    temp: float
    humidity: float
    pressure: float
    wind_speed: float
    battery_level: float
    signal_strength: float
    latency_ms: float
    packet_loss_rate: float
    anomaly_flag: int

class AnomaliesResponse(BaseModel):
    total_anomalies: int
    anomaly_percentage: float
    recent_anomalies: List[AnomalyRecord]

class PredictionRecord(BaseModel):
    unix_ts: float
    timestamp: str
    actual: float
    predicted: float

class AnalyticsSummary(BaseModel):
    total_records: int
    anomaly_count: int
    average_temperature: float
    average_humidity: float
    average_battery_level: float
    average_latency: float
    average_packet_loss: float
    average_network_health: Optional[float] = 0.0

class AlertResponse(BaseModel):
    node_id: str
    alert_type: str
    severity: str
    message: str
    value: float
    timestamp: str

class NodeHealthDetails(BaseModel):
    node_id: str
    battery_level: float
    signal_strength: float
    latency_ms: float
    packet_loss_rate: float
    timestamp: str
    battery_score: float
    signal_score: float
    latency_score: float
    packet_loss_score: float
    network_health_score: float
    network_health_status: str

class NetworkPredictionsResponse(BaseModel):
    battery: List[PredictionRecord]
    latency: List[PredictionRecord]
    packet_loss: List[PredictionRecord]

class SystemScoreResponse(BaseModel):
    average_health: float
    status_counts: Dict[str, int]
    active_nodes: int
    system_status: str

class NetworkHealthHistoryRecord(BaseModel):
    timestamp: str
    unix_ts: float
    node_id: str
    network_health_score: float
    battery_score: float
    signal_score: float
    latency_score: float
    packet_loss_score: float

class SimulationSettings(BaseModel):
    data_interval: int
    heartbeat_interval: int
    packet_loss_rate: float
    max_delay_ms: int
    battery_discharge_heartbeat: float
    battery_discharge_data: float
    battery_discharge_idle: float
    rssi_baseline: float
    rssi_noise: float
    polling_interval: int
    demo_mode: Optional[bool] = False

class SettingsResponse(BaseModel):
    mqtt: dict
    simulation: SimulationSettings
    cities: List[str]
