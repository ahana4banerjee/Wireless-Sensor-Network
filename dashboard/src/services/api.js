const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchFromApi(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      // Try to parse detailed error message if possible
      let errorMsg = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errorMsg = errJson.detail;
        }
      } catch (e) {}
      throw new Error(errorMsg);
    }
    return await response.json();
  } catch (error) {
    console.error(`Fetch failed for ${endpoint}:`, error);
    throw error;
  }
}

export const wsnApi = {
  getHealth: () => fetchFromApi("/api/health"),
  getNodes: () => fetchFromApi("/api/nodes"),
  getLiveData: () => fetchFromApi("/api/live-data"),
  getAnomalies: (limit = 50) => fetchFromApi(`/api/anomalies?limit=${limit}`),
  getTempPredictions: (limit = 100) => fetchFromApi(`/api/predictions/temperature?limit=${limit}`),
  getHumidityPredictions: (limit = 100) => fetchFromApi(`/api/predictions/humidity?limit=${limit}`),
  getAnalyticsSummary: () => fetchFromApi("/api/analytics/summary"),
  getAlerts: (includeHistory = true, limit = 50) => 
    fetchFromApi(`/api/alerts?include_history=${includeHistory}&limit=${limit}`),
  getNetworkHealth: () => fetchFromApi("/api/network-health"),
  getNetworkPredictions: (limit = 100) => fetchFromApi(`/api/network-predictions?limit=${limit}`),
  getSystemScore: () => fetchFromApi("/api/system-score"),
  getNetworkHealthHistory: (limit = 150) => fetchFromApi(`/api/analytics/network-health-history?limit=${limit}`),
  getSettings: () => fetchFromApi("/api/settings"),
  updateSettings: (payload) => fetchFromApi("/api/settings", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }),
  getSystemSummaryText: async () => {
    const response = await fetch(`${API_BASE_URL}/api/reports/system-summary`);
    if (!response.ok) throw new Error("Failed to fetch system summary preview.");
    return await response.text();
  },
  getModelsAll: () => fetchFromApi("/api/models"),
  getModelsCurrent: () => fetchFromApi("/api/models/current"),
  getModelsHistory: () => fetchFromApi("/api/models/history"),
  getModelsStatus: () => fetchFromApi("/api/models/status"),
};

export const EXPORT_URLS = {
  telemetry: `${API_BASE_URL}/api/export/telemetry`,
  alerts: `${API_BASE_URL}/api/export/alerts`,
  prediction: (type) => `${API_BASE_URL}/api/export/predictions?type=${type}`,
  reportAnomaly: `${API_BASE_URL}/api/export/report/anomaly`,
  reportHealth: `${API_BASE_URL}/api/export/report/network-health`,
  systemSummary: `${API_BASE_URL}/api/reports/system-summary`
};
