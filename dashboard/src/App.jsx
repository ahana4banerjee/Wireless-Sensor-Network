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
  const [apiOnline, setApiOnline] = useState(false);
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());
  const [visitedPages, setVisitedPages] = useState(['mission-control']);

  // Clock interval updates every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track visited pages to cache them
  useEffect(() => {
    if (!visitedPages.includes(currentPage)) {
      setVisitedPages(prev => [...prev, currentPage]);
    }
  }, [currentPage, visitedPages]);

  // Core API Fetch and polling lifecycle (lightweight health & settings sync only)
  useEffect(() => {
    let isMounted = true;

    const performHealthAndSettingsCheck = async () => {
      try {
        await wsnApi.getHealth();
        if (!isMounted) return;
        setApiOnline(true);

        const settingsRes = await wsnApi.getSettings().catch(err => {
          console.warn("Failed to get settings in health check:", err);
          return null;
        });

        if (!isMounted) return;
        if (settingsRes && settingsRes.simulation && settingsRes.simulation.polling_interval) {
          setPollingInterval(settingsRes.simulation.polling_interval);
        }
      } catch (error) {
        console.error("Dashboard failed to communicate with backend:", error);
        if (isMounted) setApiOnline(false);
      }
    };

    // Initial check
    performHealthAndSettingsCheck();

    // Poll at dynamic intervals
    let intervalId = setInterval(performHealthAndSettingsCheck, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Page switcher router mapping using visbility caching
  const renderPage = () => {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <div style={{ display: currentPage === 'mission-control' ? 'block' : 'none', width: '100%' }}>
          {visitedPages.includes('mission-control') && (
            <div className="fade-in">
              <Overview pollingInterval={pollingInterval} autoRefresh={autoRefresh} />
            </div>
          )}
        </div>
        <div style={{ display: currentPage === 'network-intelligence' ? 'block' : 'none', width: '100%' }}>
          {visitedPages.includes('network-intelligence') && (
            <div className="fade-in">
              <Analytics />
            </div>
          )}
        </div>
        <div style={{ display: currentPage === 'predictive-analytics' ? 'block' : 'none', width: '100%' }}>
          {visitedPages.includes('predictive-analytics') && (
            <div className="fade-in">
              <Predictions />
            </div>
          )}
        </div>
        <div style={{ display: currentPage === 'incident-center' ? 'block' : 'none', width: '100%' }}>
          {visitedPages.includes('incident-center') && (
            <div className="fade-in">
              <Alerts />
            </div>
          )}
        </div>
        <div style={{ display: currentPage === 'simulation-settings' ? 'block' : 'none', width: '100%' }}>
          {visitedPages.includes('simulation-settings') && (
            <div className="fade-in">
              <Settings />
            </div>
          )}
        </div>
        <div style={{ display: currentPage === 'export-center' ? 'block' : 'none', width: '100%' }}>
          {visitedPages.includes('export-center') && (
            <div className="fade-in">
              <ExportCenter />
            </div>
          )}
        </div>
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

