from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes.nodes import router as nodes_router
from src.api.routes.analytics import router as analytics_router
from src.api.routes.predictions import router as predictions_router
from src.api.routes.alerts import router as alerts_router
from src.api.routes.network_intelligence import router as network_intelligence_router
from src.api.routes.settings import router as settings_router
from src.api.routes.export import router as export_router
from src.api.schemas import HealthResponse, RootResponse

app = FastAPI(
    title="Intelligent WSN API",
    description="REST API layer exposing telemetry, faults, predictions, and analysis for the Wireless Sensor Network",
    version="1.0"
)

# Enable CORS for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development ease, customizable later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount modular route controllers
app.include_router(nodes_router, prefix="/api", tags=["Nodes & Telemetry"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics & Outliers"])
app.include_router(predictions_router, prefix="/api", tags=["Predictive Models"])
app.include_router(alerts_router, prefix="/api", tags=["Alerts & Faults"])
app.include_router(network_intelligence_router, prefix="/api", tags=["Network Intelligence & Predictions"])
app.include_router(settings_router, prefix="/api", tags=["Settings & Configurations"])
app.include_router(export_router, prefix="/api", tags=["Export & Reporting Services"])

@app.get("/", response_model=RootResponse)
def read_root():
    """Returns project details and version."""
    return RootResponse(
        project="Intelligent Wireless Sensor Network",
        version="1.0"
    )

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    """Simple API health check endpoint."""
    return HealthResponse(
        status="online",
        service="wsn-api"
    )
