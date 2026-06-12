import { useCallback, useEffect, useState } from 'react';
import { wsnApi } from '../../services/api';
import { AlertCircle, ShieldAlert, History, RefreshCw } from 'lucide-react';
import { CardSkeleton, TableSkeleton, ErrorCard } from '../ui/Skeletons';

export default function Alerts() {
  const [activeAlerts, setActiveAlerts] = useState({ data: [], loading: true, error: null });
  const [historyAlerts, setHistoryAlerts] = useState({ data: [], loading: true, error: null });

  const fetchActiveAlerts = async (silent = false) => {
    try {
      if (!silent) setActiveAlerts(prev => ({ ...prev, loading: prev.data.length === 0, error: null }));
      const res = await wsnApi.getAlerts(false);
      setActiveAlerts({ data: res, loading: false, error: null });
    } catch (err) {
      setActiveAlerts(prev => ({ ...prev, loading: false, error: err.message || "Failed to load active alarms." }));
    }
  };

  const fetchHistoryAlerts = async (silent = false) => {
    try {
      if (!silent) setHistoryAlerts(prev => ({ ...prev, loading: prev.data.length === 0, error: null }));
      const [activeRes, combinedRes] = await Promise.all([
        wsnApi.getAlerts(false),
        wsnApi.getAlerts(true, 100)
      ]);
      const activeKeys = new Set(activeRes.map(a => `${a.node_id}-${a.alert_type}-${a.timestamp}`));
      const pureHistory = combinedRes.filter(a => !activeKeys.has(`${a.node_id}-${a.alert_type}-${a.timestamp}`));
      setHistoryAlerts({ data: pureHistory, loading: false, error: null });
    } catch (err) {
      setHistoryAlerts(prev => ({ ...prev, loading: false, error: err.message || "Failed to load historical feed." }));
    }
  };

  const loadAll = useCallback((silent = false) => {
    fetchActiveAlerts(silent);
    fetchHistoryAlerts(silent);
  }, []);

  const handleForceRefresh = () => {
    loadAll(false);
  };

  useEffect(() => {
    loadAll(false);

    const timer = setInterval(() => {
      loadAll(true);
    }, 10000);

    return () => clearInterval(timer);
  }, [loadAll]);

  // Helper for alert colors
  const getSeverityStyles = (severity) => {
    if (severity === "CRITICAL") return { bg: "bg-rose-500/10 border-rose-500/25 text-rose-400", label: "Critical" };
    if (severity === "RESOLVED") return { bg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400", label: "Resolved" };
    return { bg: "bg-amber-500/10 border-amber-500/25 text-amber-400", label: "Warning" };
  };

  const isAnyLoading = activeAlerts.loading || historyAlerts.loading;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header title */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white m-0 font-sans">Alerts & Notifications</h2>
          <p className="text-slate-400 text-sm mt-1 font-sans">Real-time node failures, threshold breaches, and anomaly notifications.</p>
        </div>
        <button
          onClick={handleForceRefresh}
          disabled={isAnyLoading}
          style={{ minWidth: '135px' }}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-900 cursor-pointer ${
            isAnyLoading ? 'opacity-65 cursor-not-allowed' : ''
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
          {isAnyLoading ? "Refreshing..." : "Force Refresh"}
        </button>
      </div>

      {/* Grid: Active Alerts Left, History Feed Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Real-time active alarms */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-200 m-0 flex items-center gap-2 font-sans">
            <ShieldAlert className="w-5 h-5 text-rose-500" /> Active System Alarms
          </h3>
          
          <div className="flex flex-col gap-4">
            {activeAlerts.error ? (
              <ErrorCard 
                title="Active Alarms Offline" 
                message={activeAlerts.error} 
                onRetry={() => fetchActiveAlerts(false)}
              />
            ) : activeAlerts.loading && activeAlerts.data.length === 0 ? (
              [...Array(3)].map((_, i) => (
                <CardSkeleton key={i} height="h-28" />
              ))
            ) : (
              <>
                {activeAlerts.data.map((alert, idx) => {
                  const styles = getSeverityStyles(alert.severity);
                  return (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border flex flex-col gap-2 relative overflow-hidden transition-all duration-200 hover:shadow-lg ${styles.bg}`}
                    >
                      {/* Left accent indicator */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      
                      <div className="flex justify-between items-center pl-2">
                        <span className="text-sm font-bold text-white font-mono">{alert.node_id}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{styles.label}</span>
                      </div>
                      
                      <p className="text-xs text-slate-300 pl-2 leading-relaxed m-0">{alert.message}</p>
                      
                      <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1 pl-2 text-[10px] text-slate-400 font-medium">
                        <span>Type: {alert.alert_type}</span>
                        <span>{alert.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
                
                {activeAlerts.data.length === 0 && (
                  <div className="glass-card p-8 text-center flex flex-col items-center justify-center gap-3">
                    <AlertCircle className="w-8 h-8 text-emerald-500 animate-pulse" />
                    <span className="text-sm text-slate-300 font-semibold">All Systems Normal</span>
                    <p className="text-xs text-slate-500 m-0">No active metric threshold warnings or node outages found.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Historical alerts list */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-200 m-0 flex items-center gap-2 font-sans">
            <History className="w-5 h-5 text-violet-500" /> WSN Historical Audit Feed
          </h3>
          
          <div className="glass-card p-6 flex flex-col gap-4">
            {historyAlerts.error ? (
              <ErrorCard 
                title="Historical Feed Offline" 
                message={historyAlerts.error} 
                onRetry={() => fetchHistoryAlerts(false)}
              />
            ) : historyAlerts.loading && historyAlerts.data.length === 0 ? (
              <TableSkeleton rows={8} cols={5} />
            ) : (
              <div className="overflow-x-auto max-h-128">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 text-xs uppercase tracking-wider font-semibold sticky top-0 bg-slate-950/90 py-2.5 z-10">
                      <th className="py-2.5 px-4">Time</th>
                      <th className="py-2.5 px-4">Node</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {historyAlerts.data.map((alert, idx) => {
                      const styles = getSeverityStyles(alert.severity);
                      return (
                        <tr key={idx} className="hover:bg-slate-900/40 transition-colors duration-150">
                          <td className="py-3 px-4 text-xs text-slate-500 font-medium font-mono">{alert.timestamp}</td>
                          <td className="py-3 px-4 font-bold text-white font-sans">{alert.node_id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-400 text-xs font-mono">{alert.alert_type}</td>
                          <td className="py-3 px-4 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${styles.bg}`}>
                              {styles.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-400 font-sans">{alert.message}</td>
                        </tr>
                      );
                    })}
                    {historyAlerts.data.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-500">No historically logged alerts found in database.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
