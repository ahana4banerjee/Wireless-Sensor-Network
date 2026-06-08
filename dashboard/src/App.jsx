import { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import { wsnApi } from './services/api';

const Overview = lazy(() => import('./components/pages/Overview'));
const Analytics = lazy(() => import('./components/pages/Analytics'));
const Predictions = lazy(() => import('./components/pages/Predictions'));
const Alerts = lazy(() => import('./components/pages/Alerts'));

export default function App() {
  const [currentPage, setCurrentPage] = useState('mission-control');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Data States
  const [nodesData, setNodesData] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());

  // Clock interval updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  // Core API Fetch and polling lifecycle
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        // Health check first
        await wsnApi.getHealth();
        if (!isMounted) return;
        setApiOnline(true);

        // Fetch WSN states in parallel
        const [nodesRes, liveRes, alertsRes, summaryRes] = await Promise.all([
          wsnApi.getNodes(),
          wsnApi.getLiveData(),
          wsnApi.getAlerts(false), // Dynamic active alerts only for counting
          wsnApi.getAnalyticsSummary()
        ]);

        if (!isMounted) return;
        setNodesData(nodesRes);
        setLiveData(liveRes);
        setAlertsData(alertsRes);
        setAnalyticsSummary(summaryRes);
      } catch (error) {
        console.error("Dashboard failed to retrieve live data:", error);
        if (isMounted) setApiOnline(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Initial fetch
    fetchAllData();

    // Poll at 10-second intervals if autoRefresh switch is active
    let intervalId = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchAllData, 10000);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh]);


  // Page switcher router mapping
  const renderPage = () => {
    return (
      <Suspense fallback={<div className="text-slate-400 py-10 font-mono text-sm">Loading module...</div>}>
        {(() => {
          switch (currentPage) {
            case 'mission-control':
              return <Overview nodesData={nodesData} liveData={liveData} alertsData={alertsData} analyticsSummary={analyticsSummary} />;
            case 'network-intelligence':
              return <Analytics />;
            case 'predictive-analytics':
              return <Predictions />;
            case 'incident-center':
              return <Alerts />;
            default:
              return <Overview nodesData={nodesData} liveData={liveData} alertsData={alertsData} analyticsSummary={analyticsSummary} />;
          }
        })()}
      </Suspense>
    );
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
              System Gateway: <span className="text-slate-100">Intelligent-WSN</span> / <span className="text-violet-400">
                {currentPage === 'mission-control' && 'Mission Control'}
                {currentPage === 'network-intelligence' && 'Network Intelligence'}
                {currentPage === 'predictive-analytics' && 'Predictive Analytics'}
                {currentPage === 'incident-center' && 'Incident Center'}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Simulation Time: <span className="text-slate-300 font-semibold">{timeStr}</span>
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
