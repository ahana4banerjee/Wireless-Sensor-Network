import { useState, useEffect, useCallback } from 'react';
import { wsnApi } from '../../services/api';
import {
  Brain, Activity, Database, Clock, CheckCircle, AlertTriangle,
  XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, TrendingUp,
  Zap, Award, BarChart2, Server, GitBranch
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODEL_LABELS = {
  temp_model:         'Temperature Predictor',
  humidity_model:     'Humidity Predictor',
  battery_model:      'Battery Linear',
  latency_model:      'Latency Linear',
  packet_loss_model:  'Packet Loss Linear',
  gb_battery_model:   'Battery Gradient Boost',
  gb_latency_model:   'Latency Gradient Boost',
  gb_packet_loss_model: 'Packet Loss Gradient Boost',
  anomaly_model:      'Anomaly Detector (IsoForest)',
};

const MODEL_CATEGORIES = {
  Environmental: ['temp_model', 'humidity_model'],
  'Network Linear': ['battery_model', 'latency_model', 'packet_loss_model'],
  'Network Gradient Boost': ['gb_battery_model', 'gb_latency_model', 'gb_packet_loss_model'],
  'Unsupervised': ['anomaly_model'],
};

function statusMeta(status) {
  switch (status) {
    case 'active':     return { label: 'Healthy',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' };
    case 'training':   return { label: 'Training',  color: 'text-amber-400',   bg: 'bg-amber-500/10  border-amber-500/30',   dot: 'bg-amber-400 animate-pulse' };
    case 'deploying':  return { label: 'Deploying', color: 'text-blue-400',    bg: 'bg-blue-500/10   border-blue-500/30',    dot: 'bg-blue-400 animate-pulse' };
    case 'rejected':   return { label: 'Rejected',  color: 'text-rose-400',    bg: 'bg-rose-500/10   border-rose-500/30',    dot: 'bg-rose-400' };
    case 'failed':     return { label: 'Failed',    color: 'text-red-400',     bg: 'bg-red-500/10    border-red-500/30',     dot: 'bg-red-500' };
    default:           return { label: status || 'Unknown', color: 'text-slate-400', bg: 'bg-slate-800 border-slate-700', dot: 'bg-slate-500' };
  }
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

function fmtNum(v, digits = 4) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(digits);
}

function TriggerBar({ label, value, max, ready }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = ready ? 'bg-emerald-500' : pct > 60 ? 'bg-amber-500' : 'bg-violet-500';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <span className={`text-xs font-bold ${ready ? 'text-emerald-400' : 'text-slate-300'}`}>
          {value} / {max}
          {ready && <span className="ml-1.5 text-emerald-400">✓ Ready</span>}
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-5 animate-pulse flex flex-col gap-3">
      <div className="h-3 w-28 bg-slate-800 rounded" />
      <div className="h-7 w-20 bg-slate-800 rounded" />
      <div className="h-2 w-36 bg-slate-800 rounded" />
    </div>
  );
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-10 bg-slate-900/60 rounded-xl" />
      ))}
    </div>
  );
}

function ModelCardSkeleton() {
  return (
    <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-5 animate-pulse flex flex-col gap-4">
      <div className="flex justify-between">
        <div className="h-4 w-36 bg-slate-800 rounded" />
        <div className="h-5 w-16 bg-slate-800 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-900 rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'violet' }) {
  const colors = {
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber:   'text-amber-400 bg-amber-500/10   border-amber-500/20',
    blue:    'text-blue-400 bg-blue-500/10     border-blue-500/20',
  };
  return (
    <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-5 flex flex-col gap-3 hover:border-slate-700/80 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

// ─── Model card ───────────────────────────────────────────────────────────────

function ModelCard({ modelKey, data }) {
  const [expanded, setExpanded] = useState(false);
  const meta = statusMeta(data?.status);
  const m = data?.metrics || {};

  return (
    <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-5 flex flex-col gap-4 hover:border-slate-700/60 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-white">{MODEL_LABELS[modelKey] || modelKey}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <GitBranch className="w-3 h-3" />
            <span>{data?.version || '—'}</span>
            <span className="text-slate-700">·</span>
            <span>{data?.algorithm || '—'}</span>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${meta.bg} ${meta.color} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'MAE',  val: m.MAE  },
          { label: 'RMSE', val: m.RMSE },
          { label: 'R²',   val: m.R2,  digits: 6 },
        ].map(({ label, val, digits }) => (
          <div key={label} className="bg-slate-900/60 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">{label}</span>
            <span className="text-sm font-bold text-white font-mono">{fmtNum(val, digits ?? 4)}</span>
          </div>
        ))}
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Hide details' : 'Show details'}
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-900 pt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-500">Trained on</span>
            <span className="text-slate-300 font-mono">{data?.dataset_size?.toLocaleString() ?? '—'} rows</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-500">Created</span>
            <span className="text-slate-300">{fmtTime(data?.created_time)}</span>
          </div>
          <div className="flex flex-col gap-0.5 col-span-2">
            <span className="text-slate-500">File</span>
            <span className="text-slate-300 font-mono break-all">{data?.filename ?? '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History table row ─────────────────────────────────────────────────────────

function HistoryRow({ entry }) {
  const meta = statusMeta(entry?.status);
  const m = entry?.metrics || {};
  return (
    <tr className="border-b border-slate-900/60 hover:bg-slate-900/30 transition-colors">
      <td className="px-4 py-3 text-xs text-slate-400">{fmtTime(entry.created_time)}</td>
      <td className="px-4 py-3 text-xs font-medium text-white">{MODEL_LABELS[entry.model_name] || entry.model_name}</td>
      <td className="px-4 py-3 text-xs font-mono text-violet-400">{entry.version}</td>
      <td className="px-4 py-3 text-xs text-slate-300 font-mono">{entry.dataset_size?.toLocaleString() ?? '—'}</td>
      <td className="px-4 py-3 text-xs font-mono text-slate-300">{fmtNum(m.MAE)}</td>
      <td className="px-4 py-3 text-xs font-mono text-slate-300">{fmtNum(m.RMSE)}</td>
      <td className="px-4 py-3 text-xs font-mono text-slate-300">{fmtNum(m.R2, 4)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.bg} ${meta.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MLOps() {
  const [status, setStatus]   = useState(null);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchAll = useCallback(async (showSkeletons = false) => {
    if (showSkeletons) setLoading(true);
    try {
      const [statusRes, currentRes, historyRes] = await Promise.all([
        wsnApi.getModelsStatus(),
        wsnApi.getModelsCurrent(),
        wsnApi.getModelsHistory(),
      ]);
      setStatus(statusRes);
      setCurrent(currentRes);
      setHistory(historyRes);
      setError(null);
      setLastFetch(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message || 'Failed to load ML Operations data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleForceRefresh = () => {
    setRefreshing(true);
    const minDelay = new Promise(resolve => setTimeout(resolve, 2000));
    const fetch = fetchAll(true);
    Promise.all([fetch, minDelay]).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchAll(true);
    const id = setInterval(() => fetchAll(false), 30000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const isAnyLoading = loading || refreshing;

  // Derived values
  const totalModels    = current ? Object.keys(current).length : 0;
  const healthyModels  = current ? Object.values(current).filter(m => m.status === 'active').length : 0;
  const datasetSize    = status?.dataset_size ?? 0;
  const elapsedHours   = status?.elapsed_hours_since_training;
  const policy         = status?.retraining_policy ?? {};
  const triggers       = status?.trigger_status ?? {};
  const newSamples     = status?.new_samples_since_last_training ?? 0;

  // Filter models by category
  const categoryKeys = selectedCategory === 'All'
    ? Object.keys(current ?? {})
    : (MODEL_CATEGORIES[selectedCategory] ?? []).filter(k => current?.[k]);

  return (
    <div className="flex flex-col gap-8 w-full">

      {/* ── Page header ─── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600/20 p-2.5 rounded-xl border border-violet-500/30">
              <Brain className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">ML Operations</h2>
          </div>
          <p className="text-sm text-slate-500 ml-14">
            Lifecycle management for all deployed machine learning models.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastFetch && (
            <span className="text-xs text-slate-600">Updated {lastFetch}</span>
          )}
          <button
            onClick={handleForceRefresh}
            disabled={isAnyLoading}
            style={{ minWidth: '140px' }}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer ${
              isAnyLoading ? 'opacity-65 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
            {isAnyLoading ? 'Refreshing...' : 'Force Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error banner ─── */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-5 py-4 text-sm text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Overview stat cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isAnyLoading ? (
          [...Array(4)].map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={Server}
              label="Total Models"
              value={totalModels}
              sub={`${healthyModels} Healthy`}
              color="violet"
            />
            <StatCard
              icon={Database}
              label="Dataset Size"
              value={datasetSize.toLocaleString()}
              sub="Total training rows"
              color="blue"
            />
            <StatCard
              icon={Clock}
              label="Last Trained"
              value={elapsedHours !== null ? `${elapsedHours}h ago` : '—'}
              sub={fmtTime(status?.last_training_time)}
              color="amber"
            />
            <StatCard
              icon={triggers.retrain_ready ? Zap : Activity}
              label="Retrain Status"
              value={triggers.retrain_ready ? 'Due Now' : 'Watching'}
              sub={`Next check: ${policy.check_interval_seconds ?? '—'}s`}
              color={triggers.retrain_ready ? 'emerald' : 'violet'}
            />
          </>
        )}
      </div>

      {/* ── Retraining trigger conditions ─── */}
      <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Retraining Trigger Conditions</h3>
          <span className="ml-auto text-xs text-slate-500">
            Both conditions must be met simultaneously
          </span>
        </div>
        {isAnyLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-8 bg-slate-900 rounded-xl" />
            <div className="h-8 bg-slate-900 rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <TriggerBar
              label="Dataset Growth"
              value={newSamples}
              max={policy.min_new_samples ?? 500}
              ready={triggers.sample_trigger_ready}
            />
            <TriggerBar
              label="Elapsed Time Since Last Training"
              value={elapsedHours ?? 0}
              max={policy.min_time_elapsed_hours ?? 24}
              ready={triggers.time_trigger_ready}
            />
          </div>
        )}
        {!isAnyLoading && triggers.retrain_ready && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Both conditions satisfied — Training Manager will trigger a retrain cycle on next check.
          </div>
        )}
      </div>

      {/* ── Deployed models ─── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Award className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Deployed Models</h3>
          </div>
          {/* Category filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['All', ...Object.keys(MODEL_CATEGORIES)].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isAnyLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <ModelCardSkeleton key={i} />)}
          </div>
        ) : categoryKeys.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No models found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryKeys.map(key => (
              <ModelCard key={key} modelKey={key} data={current?.[key]} />
            ))}
          </div>
        )}
      </div>

      {/* ── Training history table ─── */}
      <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-900">
          <BarChart2 className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-white">Training History</h3>
          {!isAnyLoading && history && (
            <span className="ml-auto text-xs text-slate-600">{history.length} runs total</span>
          )}
        </div>

        {isAnyLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No training history available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/80">
                  {['Timestamp', 'Model', 'Version', 'Dataset', 'MAE', 'RMSE', 'R²', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => (
                  <HistoryRow key={`${entry.model_name}-${entry.version}-${i}`} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Legend ─── */}
      <div className="flex items-center gap-6 flex-wrap text-xs text-slate-500 pb-2">
        <span className="font-semibold text-slate-400">Status Legend:</span>
        {[
          { status: 'active',    label: 'Healthy' },
          { status: 'training',  label: 'Training' },
          { status: 'deploying', label: 'Deploying' },
          { status: 'rejected',  label: 'Rejected' },
          { status: 'failed',    label: 'Failed' },
        ].map(({ status, label }) => {
          const m = statusMeta(status);
          return (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${m.dot}`} />
              <span className={m.color}>{label}</span>
            </span>
          );
        })}
      </div>

    </div>
  );
}
