from pydantic import BaseModel
from typing import List, Optional

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

class AlertResponse(BaseModel):
    node_id: str
    alert_type: str
    severity: str
    message: str
    value: float
    timestamp: str
