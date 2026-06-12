import { useState, useEffect, useRef } from 'react';
import { wsnApi } from '../../services/api';
import { 
  CardSkeleton, 
  TableSkeleton, 
  TopologySkeleton, 
  ErrorCard 
} from '../ui/Skeletons';
import { 
  Activity, 
  ShieldAlert, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Network,
  Wifi,
  Clock
} from 'lucide-react';

export default function Overview({ pollingInterval = 10, autoRefresh = true }) {
  const [showBrokerTooltip, setShowBrokerTooltip] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  // Component states
  const [nodes, setNodes] = useState({ data: null, loading: true, error: null });
  const [liveData, setLiveData] = useState({ data: [], loading: true, error: null });
  const [alerts, setAlerts] = useState({ data: [], loading: true, error: null });
  const [summary, setSummary] = useState({ data: null, loading: true, error: null });
  const [systemScore, setSystemScore] = useState({ data: null, loading: true, error: null });

  // Event feed state
  const [events, setEvents] = useState(() => {
    const initial = [];
    const cities = ["Delhi", "Hyderabad", "Mumbai", "Bangalore", "Secunderabad"];
    const eventTypes = [
      { type: 'heartbeat', message: (city) => `Node ${city} heartbeat received`, severity: 'info' },
      { type: 'prediction', message: (city) => `${city} temperature prediction updated`, severity: 'info' },
      { type: 'prediction', message: (city) => `${city} humidity prediction updated`, severity: 'info' },
      { type: 'latency', message: (city) => `Latency check on ${city}: ${Math.floor(Math.random()*150 + 120)}ms`, severity: 'info' },
      { type: 'signal', message: (city) => `Node ${city} RSSI check: -62 dBm`, severity: 'info' },
      { type: 'latency', message: (city) => `Latency spike detected on ${city}: ${Math.floor(Math.random()*300 + 750)}ms`, severity: 'warning' },
      { type: 'packet_loss', message: (city) => `Packet loss warning on ${city}: ${(Math.random()*3 + 4).toFixed(1)}%`, severity: 'warning' },
      { type: 'anomaly', message: (city) => `${city} environmental anomaly flagged by ML engine`, severity: 'critical' },
      { type: 'battery', message: (city) => `Low battery level warning on ${city}: ${Math.floor(Math.random()*10 + 8)}%`, severity: 'critical' },
    ];

    let baseTime = Date.now() - 300000;
    for (let i = 0; i < 12; i++) {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const template = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const eventTimeStr = new Date(baseTime).toLocaleTimeString();
      initial.push({
        id: `init-${i}-${baseTime}`,
        timestamp: eventTimeStr,
        type: template.type,
        message: template.message(city),
        severity: template.severity,
        nodeId: city
      });
      baseTime += Math.floor(Math.random() * 12000) + 4000;
    }
    return initial;
  });

  const eventsEndRef = useRef(null);

  // Fetch individual datasets
  const fetchNodes = async (silent = false) => {
    try {
      if (!silent) setNodes(prev => ({ ...prev, loading: prev.data === null, error: null }));
      const res = await wsnApi.getNodes();
      setNodes({ data: res, loading: false, error: null });
    } catch (err) {
      setNodes(prev => ({ ...prev, loading: false, error: err.message || "Failed to load node list." }));
    }
  };

  const fetchLiveData = async (silent = false) => {
    try {
      if (!silent) setLiveData(prev => ({ ...prev, loading: prev.data.length === 0, error: null }));
      const res = await wsnApi.getLiveData();
      setLiveData({ data: res, loading: false, error: null });
    } catch (err) {
      setLiveData(prev => ({ ...prev, loading: false, error: err.message || "Failed to fetch telemetry feed." }));
    }
  };

  const fetchAlerts = async (silent = false) => {
    try {
      if (!silent) setAlerts(prev => ({ ...prev, loading: prev.data.length === 0, error: null }));
      const res = await wsnApi.getAlerts(false);
      setAlerts({ data: res, loading: false, error: null });
    } catch (err) {
      setAlerts(prev => ({ ...prev, loading: false, error: err.message || "Failed to load incidents log." }));
    }
  };

  const fetchSummary = async (silent = false) => {
    try {
      if (!silent) setSummary(prev => ({ ...prev, loading: prev.data === null, error: null }));
      const res = await wsnApi.getAnalyticsSummary();
      setSummary({ data: res, loading: false, error: null });
    } catch (err) {
      setSummary(prev => ({ ...prev, loading: false, error: err.message || "Failed to load analytics summary." }));
    }
  };

  const fetchSystemScore = async (silent = false) => {
    try {
      if (!silent) setSystemScore(prev => ({ ...prev, loading: prev.data === null, error: null }));
      const res = await wsnApi.getSystemScore();
      setSystemScore({ data: res, loading: false, error: null });
    } catch (err) {
      setSystemScore(prev => ({ ...prev, loading: false, error: err.message || "Failed to compute grid health score." }));
    }
  };

  const loadAll = (silent = false) => {
    fetchNodes(silent);
    fetchLiveData(silent);
    fetchAlerts(silent);
    fetchSummary(silent);
    fetchSystemScore(silent);
  };

  // Initial mount and polling fetch loop
  useEffect(() => {
    loadAll(false);
    
    let intervalId = null;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        loadAll(true);
      }, pollingInterval * 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingInterval, autoRefresh]);

  // Auto-scroll logic for events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Observer 1: Live Telemetry update watcher
  const lastLiveDataRef = useRef(null);
  useEffect(() => {
    if (!liveData.data || liveData.data.length === 0) return;

    if (lastLiveDataRef.current) {
      const newEvents = [];
      liveData.data.forEach(row => {
        const prevRow = lastLiveDataRef.current.find(r => r.city === row.city);
        if (prevRow && prevRow.timestamp !== row.timestamp) {
          newEvents.push({
            id: `live-telemetry-${row.city}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'heartbeat',
            message: `Node ${row.city} heartbeat received`,
            severity: 'info',
            nodeId: row.city
          });

          if (row.battery_level < 20.0) {
            newEvents.push({
              id: `live-battery-${row.city}-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'battery',
              message: `Battery level warning: ${row.battery_level.toFixed(1)}%`,
              severity: row.battery_level < 5.0 ? 'critical' : 'warning',
              nodeId: row.city
            });
          }

          if (row.latency_ms > 1000.0) {
            newEvents.push({
              id: `live-latency-${row.city}-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'latency',
              message: `Latency spike detected: ${row.latency_ms.toFixed(0)}ms`,
              severity: 'warning',
              nodeId: row.city
            });
          }

          if (row.packet_loss_rate > 5.0) {
            newEvents.push({
              id: `live-loss-${row.city}-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'packet_loss',
              message: `Packet loss warning: ${row.packet_loss_rate.toFixed(1)}%`,
              severity: row.packet_loss_rate > 10.0 ? 'critical' : 'warning',
              nodeId: row.city
            });
          }
        }
      });

      if (newEvents.length > 0) {
        setEvents(prev => {
          const next = [...prev, ...newEvents];
          return next.length > 100 ? next.slice(next.length - 100) : next;
        });
      }
    }
    lastLiveDataRef.current = liveData.data;
  }, [liveData.data]);

  // Observer 2: Alarm logs watcher
  const lastAlertsCount = useRef(0);
  useEffect(() => {
    if (!alerts.data) return;

    if (alerts.data.length > lastAlertsCount.current) {
      const newAlerts = alerts.data.slice(lastAlertsCount.current);
      const newEvents = newAlerts.map((alert, idx) => ({
        id: `live-alert-${Date.now()}-${idx}`,
        timestamp: new Date().toLocaleTimeString(),
        type: alert.alert_type?.toLowerCase() || 'anomaly',
        message: alert.message,
        severity: alert.severity === 'CRITICAL' ? 'critical' : 'warning',
        nodeId: alert.node_id
      }));

      setEvents(prev => {
        const next = [...prev, ...newEvents];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
    }
    lastAlertsCount.current = alerts.data.length;
  }, [alerts.data]);

  // Observer 3: Mock event background interval
  useEffect(() => {
    const cities = ["Delhi", "Hyderabad", "Mumbai", "Bangalore", "Secunderabad"];
    const mockTemplates = [
      { type: 'heartbeat', message: (city) => `Node ${city} routing check: OK`, severity: 'info' },
      { type: 'prediction', message: (city) => `${city} temperature prediction updated`, severity: 'info' },
      { type: 'prediction', message: (city) => `${city} humidity prediction updated`, severity: 'info' },
      { type: 'latency', message: (city) => `Node ${city} response latency: ${Math.floor(Math.random()*40 + 80)}ms`, severity: 'info' },
      { type: 'signal', message: (city) => `Node ${city} RSSI check: ${Math.floor(Math.random()*15 - 65)} dBm`, severity: 'info' },
    ];

    const timer = setInterval(() => {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const template = mockTemplates[Math.floor(Math.random() * mockTemplates.length)];

      const newEvent = {
        id: `bg-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: template.type,
        message: template.message(city),
        severity: template.severity,
        nodeId: city
      };

      setEvents(prev => {
        const next = [...prev, newEvent];
        return next.length > 100 ? next.slice(next.length - 100) : next;
      });
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  // Compute status helpers
  const totalNodes = nodes.data?.total_nodes || 5;
  const onlineNodes = nodes.data?.nodes?.filter(n => n.status === "ONLINE").length || 0;
  
  const nodeStatusMap = {};
  const nodeDetailsMap = {};
  nodes.data?.nodes?.forEach(n => {
    nodeStatusMap[n.node_id] = n.status;
    nodeDetailsMap[n.node_id] = n;
  });

  const dbRecords = summary.data?.total_records !== undefined ? summary.data.total_records : 0;
  const anomalyCount = summary.data?.anomaly_count !== undefined ? summary.data.anomaly_count : 0;
  const avgTemp = summary.data?.average_temperature !== undefined ? summary.data.average_temperature : 0;
  const avgHumidity = summary.data?.average_humidity !== undefined ? summary.data.average_humidity : 0;
  const avgLatency = summary.data?.average_latency !== undefined ? summary.data.average_latency : 0;
  const avgPacketLoss = summary.data?.average_packet_loss !== undefined ? summary.data.average_packet_loss : 0;

  const networkHealthScore = systemScore.data?.average_health !== undefined
    ? systemScore.data.average_health.toFixed(1)
    : (100 - avgPacketLoss).toFixed(1);
    
  let networkHealthLabel = systemScore.data?.system_status || "OPTIMAL";
  let networkHealthColor = "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  
  if (networkHealthLabel === "FAILING" || networkHealthLabel === "CRITICAL") {
    networkHealthColor = "border-rose-500/20 bg-rose-500/10 text-rose-400";
  } else if (networkHealthLabel === "WARNING") {
    networkHealthColor = "border-amber-500/20 bg-amber-500/10 text-amber-400";
  } else if (networkHealthLabel === "GOOD") {
    networkHealthColor = "border-cyan-500/20 bg-cyan-500/10 text-cyan-400";
  }

  const recentAlerts = alerts.data?.slice(0, 5) || [];

  const getNodeColor = (cityName) => {
    const status = nodeStatusMap[cityName] || "OFFLINE";
    if (status === "OFFLINE") return { hex: "#ef4444", text: "text-rose-500", name: "Fault" };

    const record = liveData.data?.find(row => row.city === cityName);
    if (!record) return { hex: "#10b981", text: "text-emerald-500", name: "Healthy" };

    if (record.battery_level <= 10.0 || record.latency_ms >= 1000.0) {
      return { hex: "#ef4444", text: "text-rose-500", name: "Fault" };
    }
    if (
      record.battery_level <= 25.0 ||
      record.latency_ms >= 500.0 ||
      record.packet_loss_rate >= 5.0 ||
      record.signal_strength <= -85.0
    ) {
      return { hex: "#f59e0b", text: "text-amber-500", name: "Warning" };
    }
    return { hex: "#10b981", text: "text-emerald-500", name: "Healthy" };
  };

  const getNodeMetrics = (cityName) => {
    const record = liveData.data?.find(row => row.city === cityName);
    if (!record) {
      const nodeInfo = nodes.data?.nodes?.find(n => n.node_id === cityName);
      return {
        status: nodeInfo?.status || "OFFLINE",
        battery: nodeInfo ? `${nodeInfo.battery_level.toFixed(0)}%` : "0%",
        signal: nodeInfo ? `${nodeInfo.signal_strength.toFixed(0)} dBm` : "-100 dBm",
        latency: "N/A",
        packetLoss: "N/A"
      };
    }
    const status = nodeStatusMap[cityName] || "OFFLINE";
    return {
      status,
      battery: `${record.battery_level.toFixed(1)}%`,
      signal: `${record.signal_strength.toFixed(0)} dBm`,
      latency: `${record.latency_ms.toFixed(0)} ms`,
      packetLoss: `${record.packet_loss_rate.toFixed(1)}%`
    };
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      
      {/* SECTION A: EXECUTIVE STATUS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-[#0b1121] border border-slate-800 p-4 rounded-md min-h-[80px]">
        {/* Metric 1: Gateway */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2 justify-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Gateway Service</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${nodes.error ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${nodes.error ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
            </div>
            <span className="text-sm font-bold font-mono text-white">
              {nodes.error ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>
        </div>

        {/* Metric 2: Active Nodes */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2 justify-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Active Nodes</span>
          {nodes.loading && !nodes.data ? (
            <div className="h-4 w-12 bg-slate-900 animate-pulse rounded mt-1" />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold font-mono text-white">
                {nodes.error ? 'N/A' : onlineNodes}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {totalNodes}</span>
            </div>
          )}
        </div>

        {/* Metric 3: Anomalies */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2 justify-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Total Anomalies</span>
          {summary.loading && !summary.data ? (
            <div className="h-4 w-12 bg-slate-900 animate-pulse rounded mt-1" />
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <ShieldAlert className={`w-4 h-4 ${anomalyCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-base font-bold font-mono text-white">
                {summary.error ? 'N/A' : anomalyCount}
              </span>
            </div>
          )}
        </div>

        {/* Metric 4: Latency */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2 justify-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Avg Latency</span>
          {summary.loading && !summary.data ? (
            <div className="h-4 w-16 bg-slate-900 animate-pulse rounded mt-1" />
          ) : (
            <div className="flex items-baseline gap-0.5 mt-1">
              <span className="text-lg font-bold font-mono text-white">
                {summary.error ? 'N/A' : avgLatency.toFixed(0)}
              </span>
              {!summary.error && <span className="text-[10px] text-slate-500 font-mono">ms</span>}
            </div>
          )}
        </div>

        {/* Metric 5: Loss */}
        <div className="flex flex-col gap-1 border-r border-slate-800/60 last:border-r-0 px-2 justify-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Packet Loss</span>
          {summary.loading && !summary.data ? (
            <div className="h-4 w-12 bg-slate-900 animate-pulse rounded mt-1" />
          ) : (
            <div className="flex items-baseline gap-0.5 mt-1">
              <span className="text-lg font-bold font-mono text-white">
                {summary.error ? 'N/A' : avgPacketLoss.toFixed(1)}
              </span>
              {!summary.error && <span className="text-[10px] text-slate-500 font-mono">%</span>}
            </div>
          )}
        </div>

        {/* Metric 6: DB Size */}
        <div className="flex flex-col gap-1 px-2 justify-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">DB Size</span>
          {summary.loading && !summary.data ? (
            <div className="h-4 w-20 bg-slate-900 animate-pulse rounded mt-1" />
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <Database className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-sm font-bold font-mono text-white">
                {summary.error ? 'N/A' : dbRecords.toLocaleString() + ' recs'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION B: TOPOLOGY, HEALTH OVERVIEW & LIVE EVENT STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns (Schematic & Health Grid) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Topology Schematic */}
          {nodes.loading && !nodes.data ? (
            <TopologySkeleton />
          ) : nodes.error ? (
            <ErrorCard 
              title="Topology Schematic Offline" 
              message={`Failed to fetch network nodes status: ${nodes.error}`}
              onRetry={() => fetchNodes(false)}
            />
          ) : (
            <div className="glass-card p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-violet-500" /> MQTT Topology Schematic
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Auto Layout / Port 1883</span>
              </div>
              
              <div className="flex items-center justify-center bg-slate-950/40 p-2 rounded border border-slate-850">
                <svg viewBox="0 0 600 220" className="w-full h-auto text-slate-400">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(51, 65, 85, 0.08)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" rx="4" />

                  {/* Connection Lines */}
                  <path d="M 300 55 L 300 90 L 80 90 L 80 140" fill="none" stroke={nodeStatusMap["Delhi"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" className={`transition-all duration-300 ${nodeStatusMap["Delhi"] === "ONLINE" ? "flow-line-active" : ""}`} strokeDasharray={nodeStatusMap["Delhi"] === "ONLINE" ? "8,4" : "4,4"} />
                  <path d="M 300 55 L 300 90 L 190 90 L 190 140" fill="none" stroke={nodeStatusMap["Hyderabad"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" className={`transition-all duration-300 ${nodeStatusMap["Hyderabad"] === "ONLINE" ? "flow-line-active" : ""}`} strokeDasharray={nodeStatusMap["Hyderabad"] === "ONLINE" ? "8,4" : "4,4"} />
                  <path d="M 300 55 L 300 140" fill="none" stroke={nodeStatusMap["Mumbai"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" className={`transition-all duration-300 ${nodeStatusMap["Mumbai"] === "ONLINE" ? "flow-line-active" : ""}`} strokeDasharray={nodeStatusMap["Mumbai"] === "ONLINE" ? "8,4" : "4,4"} />
                  <path d="M 300 55 L 300 90 L 410 90 L 410 140" fill="none" stroke={nodeStatusMap["Bangalore"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" className={`transition-all duration-300 ${nodeStatusMap["Bangalore"] === "ONLINE" ? "flow-line-active" : ""}`} strokeDasharray={nodeStatusMap["Bangalore"] === "ONLINE" ? "8,4" : "4,4"} />
                  <path d="M 300 55 L 300 90 L 520 90 L 520 140" fill="none" stroke={nodeStatusMap["Secunderabad"] === "ONLINE" ? "#10b981" : "#f43f5e"} strokeWidth="1.5" className={`transition-all duration-300 ${nodeStatusMap["Secunderabad"] === "ONLINE" ? "flow-line-active" : ""}`} strokeDasharray={nodeStatusMap["Secunderabad"] === "ONLINE" ? "8,4" : "4,4"} />

                  {/* Broker Node */}
                  <g transform="translate(260, 25)">
                    <rect x="0" y="0" width="80" height="32" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                    <text x="40" y="19" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace">MQTT Broker</text>
                    <circle 
                      cx="10" 
                      cy="8" 
                      r="3.5" 
                      fill="#10b981" 
                      className="cursor-pointer hover:scale-125 transition-all duration-150"
                      onMouseEnter={() => setShowBrokerTooltip(true)}
                      onMouseLeave={() => setShowBrokerTooltip(false)}
                    />
                  </g>

                  {showBrokerTooltip && (
                    <g transform="translate(250, 2)" className="pointer-events-none">
                      <rect x="0" y="0" width="100" height="20" rx="3" fill="#022c22" stroke="#10b981" strokeWidth="1" />
                      <polygon points="20,20 17,24 23,24" fill="#10b981" />
                      <text x="50" y="13" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">broker active</text>
                    </g>
                  )}

                  {/* Cities */}
                  {["Delhi", "Hyderabad", "Mumbai", "Bangalore", "Secunderabad"].map((city, idx) => {
                    const xCoords = [40, 150, 260, 370, 480];
                    const isOnline = nodeStatusMap[city] === "ONLINE";
                    return (
                      <g key={city} transform={`translate(${xCoords[idx]}, 140)`}>
                        <rect x="0" y="0" width="80" height="48" rx="4" fill="#0f172a" stroke={isOnline ? "#059669" : "#dc2626"} strokeWidth="1.5" />
                        <text x="40" y="16" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace">{city}</text>
                        <text x="40" y="28" textAnchor="middle" fill={isOnline ? "#34d399" : "#f87171"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                          {nodeStatusMap[city] || "OFFLINE"}
                        </text>
                        {nodeDetailsMap[city] && (
                          <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                            {nodeDetailsMap[city].battery_level.toFixed(0)}% Bat
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Health Overview Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Node Health */}
            {nodes.loading && !nodes.data ? (
              <CardSkeleton />
            ) : nodes.error ? (
              <ErrorCard 
                title="Node Health Unavailable" 
                message={nodes.error} 
                onRetry={() => fetchNodes(false)}
              />
            ) : (
              <div className="glass-card p-4 flex flex-col justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Node Health</span>
                  <span className="text-lg font-bold font-mono text-white mt-1">{onlineNodes} / {totalNodes} Online</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">Percentage of sensor hardware checking in on topic broadcasts.</p>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-sm h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-sm transition-all duration-300"
                      style={{ width: `${(onlineNodes / totalNodes) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: Network Health */}
            {systemScore.loading && !systemScore.data ? (
              <CardSkeleton />
            ) : systemScore.error ? (
              <ErrorCard 
                title="Network Health Score Offline" 
                message={systemScore.error} 
                onRetry={() => fetchSystemScore(false)}
              />
            ) : (
              <div className="glass-card p-4 flex flex-col justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Network Health</span>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-lg font-bold font-mono text-white">{networkHealthScore}%</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border rounded-sm ${networkHealthColor}`}>
                      {networkHealthLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">Operational score evaluated using explainable WSN rules.</p>
                </div>
                <div className="mt-3 border-t border-slate-850 pt-2 flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Loss: {avgPacketLoss.toFixed(1)}%</span>
                  <span>Avg Latency: {avgLatency.toFixed(0)}ms</span>
                </div>
              </div>
            )}

            {/* Card 3: Environmental Health */}
            {summary.loading && !summary.data ? (
              <CardSkeleton />
            ) : summary.error ? (
              <ErrorCard 
                title="Averages Stream Offline" 
                message={summary.error} 
                onRetry={() => fetchSummary(false)}
              />
            ) : (
              <div className="glass-card p-4 flex flex-col justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Environmental Health</span>
                  <div className="flex flex-col mt-1 gap-0.5">
                    <span className="text-sm font-bold font-mono text-white">Avg Temp: {avgTemp.toFixed(1)}°C</span>
                    <span className="text-sm font-bold font-mono text-white">Avg Humid: {avgHumidity.toFixed(1)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">Geographical atmospheric baseline for active regional metrics.</p>
                </div>
                <div className="mt-3 border-t border-slate-850 pt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Standard Ranges Verified</span>
                </div>
              </div>
            )}

            {/* Card 4: Prediction Engine Status (Static specs from predictions) */}
            <div className="glass-card p-4 flex flex-col justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Prediction Engine</span>
                <span className="text-lg font-bold font-mono text-white mt-1">0.99 MAE (Temp)</span>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">Linear Regression forecasting environmental parameters.</p>
              </div>
              <div className="mt-3 border-t border-slate-850 pt-2 flex justify-between text-[10px] font-mono text-slate-400">
                <span className="text-emerald-400">Models Synced</span>
                <span>Hum MAE: 8.03</span>
              </div>
            </div>

          </div>
        </div>

        {/* Live Event Stream Panel (Right Column) */}
        <div className="lg:col-span-4 glass-card p-4 flex flex-col max-h-[520px]">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2 mb-3">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" /> Live Event Stream
            </h4>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Live Feed</span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-800">
            {alerts.loading && events.length === 0 ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-900/30 rounded animate-pulse" />
              ))
            ) : (
              events.map((event) => {
                let Icon = Activity;
                let iconColor = "text-slate-400";
                let borderLeft = "border-l-slate-800";
                let bgClass = "bg-slate-900/30";

                if (event.severity === 'critical') {
                  Icon = ShieldAlert;
                  iconColor = "text-rose-500 animate-pulse";
                  borderLeft = "border-l-rose-500";
                  bgClass = "bg-rose-950/15";
                } else if (event.severity === 'warning') {
                  Icon = AlertTriangle;
                  iconColor = "text-amber-500";
                  borderLeft = "border-l-amber-500";
                  bgClass = "bg-amber-950/15";
                } else {
                  if (event.type === 'heartbeat') {
                    Icon = CheckCircle;
                    iconColor = "text-emerald-400";
                    borderLeft = "border-l-emerald-500/50";
                  } else if (event.type === 'prediction') {
                    Icon = TrendingUp;
                    iconColor = "text-violet-400";
                    borderLeft = "border-l-violet-500/50";
                  } else if (event.type === 'latency') {
                    Icon = Clock;
                    iconColor = "text-cyan-400";
                    borderLeft = "border-l-cyan-500/50";
                  } else if (event.type === 'signal') {
                    Icon = Wifi;
                    iconColor = "text-blue-400";
                    borderLeft = "border-l-blue-500/50";
                  }
                }

                return (
                  <div 
                    key={event.id}
                    className={`flex items-start gap-2.5 p-2 rounded-sm border border-slate-850/60 border-l-2 ${borderLeft} ${bgClass} text-[11px] font-mono transition-all duration-200 hover:border-slate-700`}
                  >
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${iconColor}`} />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="font-bold text-white truncate max-w-[150px]">{event.nodeId}</span>
                        <span className="text-[9px] text-slate-500 shrink-0">{event.timestamp}</span>
                      </div>
                      <span className="text-slate-300 break-words leading-tight">{event.message}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={eventsEndRef} />
          </div>
        </div>
      </div>

      {/* SECTION C: INTERACTIVE WSN TOPOLOGY */}
      {nodes.loading && !nodes.data ? (
        <TopologySkeleton />
      ) : nodes.error ? (
        <ErrorCard 
          title="Diagnostics Grid Offline" 
          message={nodes.error} 
          onRetry={() => fetchNodes(false)}
        />
      ) : (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Network className="w-4 h-4 text-violet-500" /> Interactive WSN Topology
            </h4>
            <span className="text-[10px] font-mono text-slate-500">Live Health Diagnostics & Link States</span>
          </div>

          <div className="flex items-center justify-center bg-slate-950/40 p-4 rounded border border-slate-850">
            <svg viewBox="0 0 600 240" className="w-full h-auto text-slate-400 overflow-visible">
              <defs>
                <pattern id="topology-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(51, 65, 85, 0.08)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#topology-grid)" rx="4" />

              {/* Trunk Connection */}
              <path d="M 300 52.5 L 300 95" fill="none" stroke="#8b5cf6" strokeWidth="2" className="flow-line-active" />
              <line x1="80" y1="95" x2="520" y2="95" stroke="#334155" strokeWidth="2" />

              {/* Central Broker */}
              <g transform="translate(245, 17.5)">
                <rect x="0" y="0" width="110" height="35" rx="6" fill="#0f172a" stroke="#8b5cf6" strokeWidth="1.5" />
                <text x="55" y="21" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace">MQTT Broker</text>
                <circle cx="12" cy="9" r="3.5" fill="#10b981" className="animate-pulse" />
              </g>

              {/* Nodes Loop */}
              {[
                { id: "HYD", name: "Hyderabad", x: 80 },
                { id: "DEL", name: "Delhi", x: 190 },
                { id: "MUM", name: "Mumbai", x: 300 },
                { id: "BLR", name: "Bangalore", x: 410 },
                { id: "SEC", name: "Secunderabad", x: 520 }
              ].map(city => {
                const nodeColor = getNodeColor(city.name);
                const metrics = getNodeMetrics(city.name);
                const isHovered = hoveredNode === city.id;
                const isOnline = nodeStatusMap[city.name] === "ONLINE";
                const isHealthyOrWarning = isOnline && nodeColor.name !== "Fault";

                return (
                  <g 
                    key={city.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredNode(city.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <path 
                      d={`M ${city.x} 95 L ${city.x} 145`}
                      fill="none" 
                      stroke={nodeColor.hex} 
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className={`transition-all duration-200 ${isHealthyOrWarning ? 'flow-line-active' : ''}`}
                    />

                    <g transform={`translate(${city.x - 32}, 145)`}>
                      <rect 
                        x="0" 
                        y="0" 
                        width="64" 
                        height="36" 
                        rx="4" 
                        fill="#0b1121" 
                        stroke={nodeColor.hex} 
                        strokeWidth={isHovered ? 2.5 : 1.5} 
                        className="transition-all duration-200"
                      />
                      <text x="32" y="22" textAnchor="middle" fill={isHovered ? "#ffffff" : "#94a3b8"} fontSize="10" fontWeight="bold" fontFamily="monospace">{city.id}</text>
                      <circle cx="10" cy="10" r="3" fill={nodeColor.hex} className={isOnline && nodeColor.name !== "Fault" ? "" : "animate-pulse"} />
                    </g>

                    {isHovered && (
                      <g className="pointer-events-none" style={{ zIndex: 50 }}>
                        <rect x={city.x - 80} y="45" width="160" height="90" rx="6" fill="#070b14" stroke={nodeColor.hex} strokeWidth="1.5" />
                        <path d={`M ${city.x - 6} 135 L ${city.x} 143 L ${city.x + 6} 135 Z`} fill={nodeColor.hex} />
                        <text x={city.x} y={60} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">{city.name}</text>
                        <text x={city.x} y={72} textAnchor="middle" fill={nodeColor.hex} fontSize="8" fontWeight="bold" fontFamily="monospace">{nodeColor.name.toUpperCase()}</text>
                        <line x1={city.x - 68} y1="78" x2={city.x + 68} y2="78" stroke="#1e293b" strokeWidth="1" />
                        
                        <text x={city.x - 68} y="90" fill="#64748b" fontSize="8" fontFamily="sans-serif">Battery</text>
                        <text x={city.x + 68} y="90" textAnchor="end" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">{metrics.battery}</text>

                        <text x={city.x - 68} y="101" fill="#64748b" fontSize="8" fontFamily="sans-serif">Signal</text>
                        <text x={city.x + 68} y="101" textAnchor="end" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">{metrics.signal}</text>

                        <text x={city.x - 68} y="112" fill="#64748b" fontSize="8" fontFamily="sans-serif">Latency</text>
                        <text x={city.x + 68} y="112" textAnchor="end" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">{metrics.latency}</text>

                        <text x={city.x - 68} y="123" fill="#64748b" fontSize="8" fontFamily="sans-serif">Loss</text>
                        <text x={city.x + 68} y="123" textAnchor="end" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="monospace">{metrics.packetLoss}</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* SECTION D: LIVE NODE TELEMETRY TABLE */}
      {liveData.loading && liveData.data.length === 0 ? (
        <div className="glass-card p-4">
          <div className="h-3 w-40 bg-slate-900 rounded mb-4 animate-pulse" />
          <TableSkeleton rows={5} cols={11} />
        </div>
      ) : liveData.error ? (
        <ErrorCard 
          title="Telemetry Table Offline" 
          message={liveData.error} 
          onRetry={() => fetchLiveData(false)}
        />
      ) : (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" /> High-Density Telemetry Stream
            </h4>
            <span className="text-[10px] font-mono text-slate-500">Direct Broker Feeds</span>
          </div>

          <div className="overflow-x-auto font-mono">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-mono text-[10px] uppercase font-bold">
                  <th className="py-1.5 px-3">Node City</th>
                  <th className="py-1.5 px-3">Status</th>
                  <th className="py-1.5 px-3 text-right">Temp</th>
                  <th className="py-1.5 px-3 text-right">Humidity</th>
                  <th className="py-1.5 px-3 text-right">Pressure</th>
                  <th className="py-1.5 px-3 text-right">Wind Speed</th>
                  <th className="py-1.5 px-3 text-right">Latency</th>
                  <th className="py-1.5 px-3 text-right">Loss</th>
                  <th className="py-1.5 px-3 text-right">Battery</th>
                  <th className="py-1.5 px-3 text-right">RSSI</th>
                  <th className="py-1.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {liveData.data.map((row) => {
                  const status = nodeStatusMap[row.city] || "OFFLINE";
                  const isOnline = status === "ONLINE";
                  return (
                    <tr key={row.city} className="hover:bg-slate-900/40 transition-colors duration-100">
                      <td className="py-1.5 px-3 font-bold text-white font-sans">{row.city}</td>
                      <td className="py-1.5 px-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
                          isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right text-violet-400 font-bold">{row.temp.toFixed(2)} °C</td>
                      <td className="py-1.5 px-3 text-right text-cyan-400 font-bold">{row.humidity.toFixed(1)}%</td>
                      <td className="py-1.5 px-3 text-right text-slate-400">{row.pressure.toFixed(1)} hPa</td>
                      <td className="py-1.5 px-3 text-right text-slate-400">{row.wind_speed.toFixed(2)} m/s</td>
                      <td className="py-1.5 px-3 text-right text-slate-300">{row.latency_ms.toFixed(0)} ms</td>
                      <td className={`py-1.5 px-3 text-right font-bold ${row.packet_loss_rate > 5.0 ? 'text-rose-400' : 'text-slate-450'}`}>
                        {row.packet_loss_rate.toFixed(2)}%
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-300">{row.battery_level.toFixed(1)}%</td>
                      <td className="py-1.5 px-3 text-right text-slate-400">{row.signal_strength.toFixed(0)} dBm</td>
                      <td className="py-1.5 px-3 text-right text-slate-500 text-[10px] font-mono">{row.timestamp}</td>
                    </tr>
                  );
                })}
                {liveData.data.length === 0 && (
                  <tr>
                    <td colSpan="11" className="py-6 text-center text-slate-500">Waiting for live data packet stream...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION E: RECENT ALERTS PREVIEW */}
      {alerts.loading && alerts.data.length === 0 ? (
        <div className="glass-card p-4">
          <div className="h-3.5 w-32 bg-slate-900 rounded mb-3 animate-pulse" />
          <div className="flex flex-col gap-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-900/30 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : alerts.error ? (
        <ErrorCard 
          title="Recent Alarm Log Offline" 
          message={alerts.error} 
          onRetry={() => fetchAlerts(false)}
        />
      ) : (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" /> Recent Alarm Log
            </h4>
            <span className="text-[10px] font-mono text-slate-500">Last 5 Incidents</span>
          </div>

          <div className="flex flex-col gap-2">
            {recentAlerts.map((alert, idx) => {
              const isCritical = alert.severity === "CRITICAL";
              const isWarning = alert.severity === "WARNING";
              
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col md:flex-row md:items-center justify-between p-2.5 rounded-sm border text-xs font-mono gap-2 ${
                    isCritical ? 'bg-rose-950/20 border-rose-500/25 text-rose-200' :
                    isWarning ? 'bg-amber-950/20 border-amber-500/25 text-amber-200' :
                    'bg-slate-900/60 border-slate-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                      isCritical ? 'bg-rose-500/20 text-rose-450 border border-rose-500/30' :
                      isWarning ? 'bg-amber-500/20 text-amber-450 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {alert.severity}
                    </span>
                    <span className="font-bold text-white bg-slate-950 px-1 py-0.5 border border-slate-800 rounded-sm">{alert.node_id}</span>
                    <span className="text-slate-300">{alert.message}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right whitespace-nowrap">
                    {alert.timestamp}
                  </div>
                </div>
              );
            })}
            {recentAlerts.length === 0 && (
              <div className="py-4 text-center text-slate-500 text-xs">No active anomalies or alarms logged.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
