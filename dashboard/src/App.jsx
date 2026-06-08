import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/pages/Overview';
import Analytics from './components/pages/Analytics';
import Predictions from './components/pages/Predictions';
import Alerts from './components/pages/Alerts';
import { wsnApi } from './services/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Data States
  const [nodesData, setNodesData] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Core API Fetch function
  const fetchAllData = async () => {
    try {
      // Health check first
      await wsnApi.getHealth();
      setApiOnline(true);

      // Fetch WSN states in parallel
      const [nodesRes, liveRes, alertsRes] = await Promise.all([
        wsnApi.getNodes(),
        wsnApi.getLiveData(),
        wsnApi.getAlerts(false) // Dynamic active alerts only for counting
      ]);

      setNodesData(nodesRes);
      setLiveData(liveRes);
      setAlertsData(alertsRes);
    } catch (error) {
      console.error("Dashboard failed to retrieve live data:", error);
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  };

  // Run initial fetch on mount
  useEffect(() => {
    setLoading(true);
    fetchAllData();
  }, []);

  // Poll at 10-second intervals if autoRefresh switch is active
  useEffect(() => {
    let intervalId = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchAllData, 10000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh]);

  // Page switcher router mapping
  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <Overview nodesData={nodesData} liveData={liveData} alertsData={alertsData} loading={loading} />;
      case 'analytics':
        return <Analytics />;
      case 'predictions':
        return <Predictions />;
      case 'alerts':
        return <Alerts />;
      default:
        return <Overview nodesData={nodesData} liveData={liveData} alertsData={alertsData} loading={loading} />;
    }
  };

  return (
    <div className="flex bg-[#090d16] text-slate-100 min-h-screen font-sans">
      {/* Navigation Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        autoRefresh={autoRefresh} 
        setAutoRefresh={setAutoRefresh}
        apiOnline={apiOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-8 md:p-10 max-h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          {/* Header breadcrumb bar */}
          <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900/50 backdrop-blur-md px-6 py-3.5 rounded-2xl">
            <div className="text-xs font-semibold text-slate-400">
              System Gateway: <span className="text-slate-100">Intelligent-WSN</span> / <span className="text-violet-400 capitalize">{currentPage}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Simulation Time: <span className="text-slate-300 font-semibold">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Active page rendering */}
          <div className="flex-1 flex w-full">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}
