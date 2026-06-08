import { useEffect, useState } from 'react';
import { wsnApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Database, AlertOctagon } from 'lucide-react';


export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [anomaliesData, setAnomaliesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [summaryRes, anomaliesRes] = await Promise.all([
          wsnApi.getAnalyticsSummary(),
          wsnApi.getAnomalies(100) // Fetch up to 100 recent anomalies for charting
        ]);

        setSummary(summaryRes);
        setAnomaliesData(anomaliesRes);
        setError(null);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Could not retrieve WSN analytics data from FastAPI server.");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  // Prepare anomaly counts per city for BarChart
  const getCityAnomalyCounts = () => {
    if (!anomaliesData?.recent_anomalies) return [];
    const counts = {};
    anomaliesData.recent_anomalies.forEach(a => {
      counts[a.node_id] = (counts[a.node_id] || 0) + 1;
    });
    return Object.keys(counts).map(city => ({
      name: city,
      anomalies: counts[city]
    })).sort((a, b) => b.anomalies - a.anomalies);
  };

  // Prepare anomaly counts per weather condition for PieChart
  const getConditionAnomalyCounts = () => {
    if (!anomaliesData?.recent_anomalies) return [];
    const counts = {};
    anomaliesData.recent_anomalies.forEach(a => {
      counts[a.condition] = (counts[a.condition] || 0) + 1;
    });
    const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#3b82f6'];
    return Object.keys(counts).map((cond, idx) => ({
      name: cond,
      value: counts[cond],
      color: COLORS[idx % COLORS.length]
    }));
  };

  const cityData = getCityAnomalyCounts();
  const conditionData = getConditionAnomalyCounts();

  if (loading) {
    return (
      <div className="flex flex-col gap-8 w-full animate-pulse">
        {/* Header */}
        <div>
          <div className="h-7 w-48 bg-slate-900 rounded mb-2" />
          <div className="h-4 w-96 bg-slate-900 rounded" />
        </div>

        {/* 5 Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-24 flex flex-col justify-between">
              <div className="h-2.5 w-24 bg-slate-900 rounded" />
              <div className="h-6 w-16 bg-slate-900 rounded" />
              <div className="h-2 w-20 bg-slate-900/50 rounded mt-1" />
            </div>
          ))}
        </div>

        {/* 2 Charts grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card p-6 h-80 flex flex-col gap-4">
              <div className="h-4 w-40 bg-slate-900 rounded" />
              <div className="flex-1 bg-slate-950/40 rounded flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-800/40 border-t-violet-500 rounded-full animate-spin" />
              </div>
            </div>
          ))}
        </div>

        {/* Audit Log Table skeleton */}
        <div className="glass-card p-6 flex flex-col gap-4">
          <div className="h-5 w-56 bg-slate-900 rounded" />
          <div className="flex flex-col gap-3">
            <div className="h-5 bg-slate-950 rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-950/40 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-5 rounded-2xl max-w-xl">
        <h4 className="font-bold text-base m-0">Failed to Retrieve Analytics</h4>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header title */}
      <div>
        <h2 className="text-2xl font-bold text-white m-0">Historical Analytics</h2>
        <p className="text-slate-400 text-sm mt-1">Exploratory analysis and statistical diagnostics computed over the integrated master dataset.</p>
      </div>

      {/* Dataset Summary Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Data Records</span>
            <span className="text-2xl font-extrabold text-white">{summary.total_records}</span>
            <span className="text-[10px] text-violet-400 flex items-center gap-1 mt-1 font-semibold">
              <Database className="w-3.5 h-3.5" /> Log Entries Combined
            </span>
          </div>
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dataset Anomalies</span>
            <span className="text-2xl font-extrabold text-rose-400">{summary.anomaly_count}</span>
            <span className="text-[10px] text-rose-500 flex items-center gap-1 mt-1 font-semibold">
              <AlertOctagon className="w-3.5 h-3.5" /> Flagged Outliers
            </span>
          </div>
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Temperature</span>
            <span className="text-2xl font-extrabold text-white">{summary.average_temperature} °C</span>
            <span className="text-[10px] text-slate-500 mt-1">Telemetry Range Average</span>
          </div>
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Latency</span>
            <span className="text-2xl font-extrabold text-white">{summary.average_latency} ms</span>
            <span className="text-[10px] text-slate-500 mt-1">Network Transmission Delay</span>
          </div>
          <div className="glass-card p-5 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Packet Loss</span>
            <span className="text-2xl font-extrabold text-white">{summary.average_packet_loss}%</span>
            <span className="text-[10px] text-slate-500 mt-1">Network Dropped Rate</span>
          </div>
        </div>
      )}

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Bar Chart: Anomalies per Node */}
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

        {/* Pie Chart: Anomalies per Weather Condition */}
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
      </div>

      {/* Recent Anomalies Log List */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-200 m-0">Machine Learning Anomaly Audit Log</h3>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 text-xs uppercase tracking-wider font-semibold sticky top-0 bg-slate-950/90 py-2.5 z-10">
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
              {anomaliesData?.recent_anomalies?.map((row, idx) => (
                <tr key={idx} className="hover:bg-rose-500/5 transition-colors duration-150">
                  <td className="py-3 px-4 text-xs text-slate-500 font-medium">{row.timestamp}</td>
                  <td className="py-3 px-4 font-bold text-white">{row.node_id}</td>
                  <td className="py-3 px-4 text-slate-400">{row.condition}</td>
                  <td className="py-3 px-4 font-medium">{row.temp.toFixed(2)}</td>
                  <td className="py-3 px-4">{row.humidity}%</td>
                  <td className="py-3 px-4">{row.signal_strength}</td>
                  <td className="py-3 px-4 font-mono">{row.latency_ms}</td>
                  <td className="py-3 px-4 font-mono">{row.packet_loss_rate}%</td>
                  <td className="py-3 px-4">
                    <span className="bg-rose-500/10 border border-rose-500/25 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      Anomaly
                    </span>
                  </td>
                </tr>
              ))}
              {(!anomaliesData || anomaliesData?.recent_anomalies?.length === 0) && (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">No anomaly points logged in the processed dataset.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
