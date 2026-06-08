const API_BASE_URL = "http://127.0.0.1:8000";

async function fetchFromApi(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
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
};
