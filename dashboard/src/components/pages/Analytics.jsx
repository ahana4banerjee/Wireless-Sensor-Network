import { useEffect, useState } from 'react';
import { wsnApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend } from 'recharts';
import { Database, AlertOctagon, Network, TrendingUp, Activity } from 'lucide-react';
import { CardSkeleton, ChartSkeleton, TableSkeleton, ErrorCard } from '../ui/Skeletons';

export default function Analytics() {
  const [summary, setSummary] = useState({ data: null, loading: true, error: null });
  const [anomaliesData, setAnomaliesData] = useState({ data: null, loading: true, error: null });
  const [healthHistory, setHealthHistory] = useState({ data: [], loading: true, error: null });

  const fetchSummary = async () => {
    try {
      setSummary(prev => ({ ...prev, loading: prev.data === null, error: null }));
      const res = await wsnApi.getAnalyticsSummary();
      setSummary({ data: res, loading: false, error: null });
    } catch (err) {
      setSummary(prev => ({ ...prev, loading: false, error: err.message || "Failed to load summary stats." }));
    }
  };

  const fetchAnomalies = async () => {
    try {
      setAnomaliesData(prev => ({ ...prev, loading: prev.data === null, error: null }));
      const res = await wsnApi.getAnomalies(100);
      setAnomaliesData({ data: res, loading: false, error: null });
    } catch (err) {
      setAnomaliesData(prev => ({ ...prev, loading: false, error: err.message || "Failed to fetch anomalies audit log." }));
    }
  };

  const fetchHealthHistory = async () => {
    try {
      setHealthHistory(prev => ({ ...prev, loading: prev.data.length === 0, error: null }));
      const res = await wsnApi.getNetworkHealthHistory(250);
      setHealthHistory({ data: res, loading: false, error: null });
    } catch (err) {
      setHealthHistory(prev => ({ ...prev, loading: false, error: err.message || "Failed to load health history trend." }));
    }
  };

  const loadAll = () => {
    fetchSummary();
    fetchAnomalies();
    fetchHealthHistory();
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Prepare anomaly counts per city for BarChart
  const getCityAnomalyCounts = () => {
    if (!anomaliesData.data?.recent_anomalies) return [];
    const counts = {};
    anomaliesData.data.recent_anomalies.forEach(a => {
      counts[a.node_id] = (counts[a.node_id] || 0) + 1;
    });
    return Object.keys(counts).map(city => ({
      name: city,
      anomalies: counts[city]
    })).sort((a, b) => b.anomalies - a.anomalies);
  };

  // Prepare anomaly counts per weather condition for PieChart
  const getConditionAnomalyCounts = () => {
    if (!anomaliesData.data?.recent_anomalies) return [];
    const counts = {};
    anomaliesData.data.recent_anomalies.forEach(a => {
      counts[a.condition] = (counts[a.condition] || 0) + 1;
    });
    const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#3b82f6'];
    return Object.keys(counts).map((cond, idx) => ({
      name: cond,
      value: counts[cond],
      color: COLORS[idx % COLORS.length]
    }));
  };

  // Group health history observations
  const getTrendData = () => {
    if (!healthHistory.data || healthHistory.data.length === 0) return [];
    const groups = {};
    healthHistory.data.forEach(r => {
      const ts = r.timestamp;
      if (!groups[ts]) {
        groups[ts] = { timestamp: ts, unix_ts: r.unix_ts };
      }
      groups[ts][r.node_id] = r.network_health_score;
    });
    return Object.values(groups).sort((a, b) => a.unix_ts - b.unix_ts);
  };

  const cityData = getCityAnomalyCounts();
  const conditionData = getConditionAnomalyCounts();

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header title */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0 font-sans">Network Intelligence</h2>
        <p className="text-slate-400 text-sm mt-1">Sensing analytics, anomaly audit feeds, and chronological Network Health Index (NHI) metrics.</p>
      </div>

      {/* Dataset Summary Metrics */}
      {summary.loading && !summary.data ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : summary.error ? (
        <ErrorCard 
          title="Summary Metrics Offline" 
          message={summary.error} 
          onRetry={fetchSummary}
        />
      ) : (
        summary.data && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="glass-card p-5 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Data Records</span>
              <span className="text-2xl font-extrabold text-white font-mono">{summary.data.total_records}</span>
              <span className="text-[10px] text-violet-400 flex items-center gap-1 mt-1 font-semibold">
                <Database className="w-3.5 h-3.5" /> Log Entries Combined
              </span>
            </div>
            <div className="glass-card p-5 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dataset Anomalies</span>
              <span className="text-2xl font-extrabold text-rose-400 font-mono">{summary.data.anomaly_count}</span>
              <span className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-semibold">
                <AlertOctagon className="w-3.5 h-3.5" /> Flagged Outliers
              </span>
            </div>
            <div className="glass-card p-5 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">WSN Network Health</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">{summary.data.average_network_health}%</span>
              <span className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1 font-semibold">
                <Activity className="w-3.5 h-3.5" /> Overall Health Index
              </span>
            </div>
            <div className="glass-card p-5 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Latency</span>
              <span className="text-2xl font-extrabold text-white font-mono">{summary.data.average_latency} ms</span>
              <span className="text-[10px] text-slate-500 mt-1 font-sans">Network Transmission Delay</span>
            </div>
            <div className="glass-card p-5 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Packet Loss</span>
              <span className="text-2xl font-extrabold text-white font-mono">{summary.data.average_packet_loss}%</span>
              <span className="text-[10px] text-slate-500 mt-1 font-sans">Network Dropped Rate</span>
            </div>
          </div>
        )
      )}

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Bar Chart: Anomalies per Node */}
        {anomaliesData.loading && !anomaliesData.data ? (
          <ChartSkeleton />
        ) : anomaliesData.error ? (
          <ErrorCard 
            title="Node Anomalies Chart Offline" 
            message={anomaliesData.error} 
            onRetry={fetchAnomalies}
          />
        ) : (
          <div className="glass-card p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-200 m-0">Anomalies Detected by WSN Node</h3>
            <div className="h-72 w-full">
              {cityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f3f4f6' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="anomalies" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {cityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#8b5cf6' : '#a78bfa'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">No recent anomaly records to chart.</div>
              )}
            </div>
          </div>
        )}

        {/* Pie Chart: Anomalies per Weather Condition */}
        {anomaliesData.loading && !anomaliesData.data ? (
          <ChartSkeleton />
        ) : anomaliesData.error ? (
          <ErrorCard 
            title="Weather Conditions Chart Offline" 
            message={anomaliesData.error} 
            onRetry={fetchAnomalies}
          />
        ) : (
          <div className="glass-card p-6 flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-200 m-0">Anomalies by Weather Condition</h3>
            <div className="h-72 w-full flex items-center justify-between">
              {conditionData.length > 0 ? (
                <>
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={conditionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {conditionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f3f4f6' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 flex flex-col gap-2">
                    {conditionData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 font-semibold">{item.name}</span>
                        <span className="text-slate-500">({item.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-500 text-sm">No recent anomaly weather records.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Network Health Index Trend Chart */}
      {healthHistory.loading && healthHistory.data.length === 0 ? (
        <ChartSkeleton height="h-80" />
      ) : healthHistory.error ? (
        <ErrorCard 
          title="Health Trend Index Chart Offline" 
          message={healthHistory.error} 
          onRetry={fetchHealthHistory}
        />
      ) : (
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-200 m-0 flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-400" /> Network Health Index (NHI) Historical Trend
              </h3>
              <p className="text-slate-400 text-xs mt-1">Explainable system health tracking calculated per observation node registry.</p>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Master Dataset History (Clamped [0, 100])</span>
          </div>
          
          <div className="h-80 w-full">
            {healthHistory.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getTrendData()} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickFormatter={(t) => t ? t.split(' ')[3] : ''}
                    tickLine={false}
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 105]} label={{ value: "Health Index Score (%)", angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f3f4f6' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  
                  <Line name="Delhi" type="monotone" dataKey="Delhi" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                  <Line name="Hyderabad" type="monotone" dataKey="Hyderabad" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                  <Line name="Mumbai" type="monotone" dataKey="Mumbai" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                  <Line name="Bangalore" type="monotone" dataKey="Bangalore" stroke="#a78bfa" strokeWidth={2} dot={false} connectNulls />
                  <Line name="Secunderabad" type="monotone" dataKey="Secunderabad" stroke="#f43f5e" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No historical health records.</div>
            )}
          </div>
        </div>
      )}

      {/* Recent Anomalies Log List Table */}
      {anomaliesData.loading && !anomaliesData.data ? (
        <div className="glass-card p-6">
          <div className="h-5 w-56 bg-slate-900 rounded mb-4 animate-pulse" />
          <TableSkeleton rows={5} cols={9} />
        </div>
      ) : anomaliesData.error ? (
        <ErrorCard 
          title="Anomalies Audit Log Offline" 
          message={anomaliesData.error} 
          onRetry={fetchAnomalies}
        />
      ) : (
        <div className="glass-card p-6 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-200 m-0">Machine Learning Anomaly Audit Log</h3>
          <div className="overflow-x-auto max-h-96 font-mono">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-900 text-slate-400 text-xs uppercase tracking-wider font-semibold sticky top-0 bg-slate-950/90 py-2.5 z-10 font-mono">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Node</th>
                  <th className="py-2.5 px-4">Weather</th>
                  <th className="py-2.5 px-4">Temp (°C)</th>
                  <th className="py-2.5 px-4">Humidity (%)</th>
                  <th className="py-2.5 px-4">RSSI (dBm)</th>
                  <th className="py-2.5 px-4">Latency (ms)</th>
                  <th className="py-2.5 px-4">Packet Loss (%)</th>
                  <th className="py-2.5 px-4">Isolation Forest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300">
                {anomaliesData.data?.recent_anomalies?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-rose-500/5 transition-colors duration-150">
                    <td className="py-3 px-4 text-xs text-slate-500 font-medium font-mono">{row.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-white font-sans">{row.node_id}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans">{row.condition}</td>
                    <td className="py-3 px-4 font-medium font-mono">{row.temp.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono">{row.humidity}%</td>
                    <td className="py-3 px-4 font-mono">{row.signal_strength}</td>
                    <td className="py-3 px-4 font-mono">{row.latency_ms}</td>
                    <td className="py-3 px-4 font-mono">{row.packet_loss_rate}%</td>
                    <td className="py-3 px-4">
                      <span className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-sans">
                        Anomaly
                      </span>
                    </td>
                  </tr>
                ))}
                {(!anomaliesData.data || anomaliesData.data?.recent_anomalies?.length === 0) && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-500">No anomaly points logged in the processed dataset.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
