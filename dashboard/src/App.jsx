import { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import { wsnApi } from './services/api';

const Overview = lazy(() => import('./components/pages/Overview'));
const Analytics = lazy(() => import('./components/pages/Analytics'));
const Predictions = lazy(() => import('./components/pages/Predictions'));
const Alerts = lazy(() => import('./components/pages/Alerts'));
const Settings = lazy(() => import('./components/pages/Settings'));
const ExportCenter = lazy(() => import('./components/pages/ExportCenter'));

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      {/* Title block skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 bg-slate-900 rounded" />
        <div className="h-4 w-96 bg-slate-900 rounded" />
      </div>

      {/* Grid of 4 card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-950/60 border border-slate-900/60 p-5 rounded-2xl h-28 flex flex-col justify-between">
            <div className="h-3 w-24 bg-slate-900 rounded" />
            <div className="h-6 w-16 bg-slate-900 rounded" />
            <div className="h-2 w-32 bg-slate-900 rounded" />
          </div>
        ))}
      </div>

      {/* Large visual panel skeleton */}
      <div className="bg-slate-950/60 border border-slate-900/60 p-6 rounded-2xl h-80 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-48 bg-slate-900 rounded" />
          <div className="h-3 w-20 bg-slate-900 rounded" />
        </div>
        <div className="flex-1 bg-slate-900/20 rounded-xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('mission-control');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(10);
  
  // Data States
  const [nodesData, setNodesData] = useState(null);
  const [liveData, setLiveData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [systemScore, setSystemScore] = useState(null);
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
        const [nodesRes, liveRes, alertsRes, summaryRes, scoreRes, settingsRes] = await Promise.all([
          wsnApi.getNodes(),
          wsnApi.getLiveData(),
          wsnApi.getAlerts(false), // Dynamic active alerts only for counting
          wsnApi.getAnalyticsSummary(),
          wsnApi.getSystemScore().catch(err => {
            console.warn("Failed to get system score:", err);
            return null;
          }),
          wsnApi.getSettings().catch(err => {
            console.warn("Failed to get settings:", err);
            return null;
          })
        ]);

        if (!isMounted) return;
        setNodesData(nodesRes);
        setLiveData(liveRes);
        setAlertsData(alertsRes);
        setAnalyticsSummary(summaryRes);
        setSystemScore(scoreRes);
        if (settingsRes && settingsRes.simulation && settingsRes.simulation.polling_interval) {
          setPollingInterval(settingsRes.simulation.polling_interval);
        }
      } catch (error) {
        console.error("Dashboard failed to retrieve live data:", error);
        if (isMounted) setApiOnline(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Initial fetch
    fetchAllData();

    // Poll at dynamic intervals if autoRefresh switch is active
    let intervalId = null;
    if (autoRefresh) {
      intervalId = setInterval(fetchAllData, pollingInterval * 1000);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, pollingInterval]);


  // Page switcher router mapping
  const renderPage = () => {
    return (
      <Suspense fallback={<PageSkeleton />}>
        {(() => {
          switch (currentPage) {
            case 'mission-control':
              return <Overview nodesData={nodesData} liveData={liveData} alertsData={alertsData} analyticsSummary={analyticsSummary} loading={loading} systemScore={systemScore} />;
            case 'network-intelligence':
              return <Analytics />;
            case 'predictive-analytics':
              return <Predictions />;
            case 'incident-center':
              return <Alerts />;
            case 'simulation-settings':
              return <Settings />;
            case 'export-center':
              return <ExportCenter />;
            default:
              return <Overview nodesData={nodesData} liveData={liveData} alertsData={alertsData} analyticsSummary={analyticsSummary} loading={loading} systemScore={systemScore} />;
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
        pollingInterval={pollingInterval}
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
                {currentPage === 'simulation-settings' && 'Simulation Settings'}
                {currentPage === 'export-center' && 'Export Center'}
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
