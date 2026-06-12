import { AlertTriangle, RefreshCw } from 'lucide-react';

export function CardSkeleton({ height = "h-28" }) {
  return (
    <div className={`glass-card p-4 ${height} flex flex-col justify-between animate-pulse bg-slate-900/10 border-slate-900`}>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 bg-slate-900/60 rounded" />
        <div className="h-6 w-16 bg-slate-900/60 rounded mt-1" />
      </div>
      <div className="h-2 w-32 bg-slate-900/60 rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 8 }) {
  return (
    <div className="w-full animate-pulse flex flex-col gap-3 py-2">
      {/* Header */}
      <div className="flex gap-4 border-b border-slate-900 pb-2">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="h-3.5 bg-slate-900/60 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-slate-900/30 py-2">
          {[...Array(cols)].map((_, c) => (
            <div key={c} className="h-3 bg-slate-900/40 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = "h-72" }) {
  return (
    <div className={`glass-card p-6 ${height} flex flex-col gap-4 animate-pulse bg-slate-900/10 border-slate-900`}>
      <div className="flex justify-between items-center">
        <div className="h-4 w-48 bg-slate-900/60 rounded" />
        <div className="h-3.5 w-24 bg-slate-900/60 rounded" />
      </div>
      <div className="flex-1 bg-slate-950/40 border border-slate-900 rounded-xl flex items-end justify-between p-6 gap-3">
        {/* Simulated chart bars or waves */}
        {[...Array(10)].map((_, i) => {
          const heights = ["h-[40%]", "h-[65%]", "h-[50%]", "h-[85%]", "h-[30%]", "h-[75%]", "h-[60%]", "h-[90%]", "h-[45%]", "h-[70%]"];
          return (
            <div key={i} className={`w-full bg-slate-900/40 rounded-t-sm ${heights[i]}`} />
          );
        })}
      </div>
    </div>
  );
}

export function TopologySkeleton() {
  return (
    <div className="glass-card p-4 h-64 flex flex-col gap-3 animate-pulse bg-slate-900/10 border-slate-900">
      <div className="h-3 w-40 bg-slate-900/60 rounded mb-2" />
      <div className="flex-1 bg-slate-950/40 border border-slate-900 rounded flex flex-col items-center justify-center gap-4">
        {/* Pulse center node */}
        <div className="w-16 h-8 bg-slate-900/80 rounded-md border border-slate-800" />
        {/* Connection paths simulation */}
        <div className="flex gap-16">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-1 h-8 bg-slate-900/60" />
              <div className="w-10 h-8 bg-slate-900/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ErrorCard({ title = "Data Stream Offline", message = "API request failed. Please check network connection.", onRetry }) {
  return (
    <div className="glass-card p-6 border-rose-950/45 bg-rose-950/5 text-rose-300 flex flex-col items-center justify-center text-center gap-3 min-h-[160px] w-full">
      <AlertTriangle className="w-8 h-8 text-rose-500 animate-pulse" />
      <div className="flex flex-col gap-1 max-w-md">
        <h4 className="text-sm font-semibold text-white font-sans m-0">{title}</h4>
        <p className="text-[11px] text-rose-400/80 leading-normal m-0">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold border border-rose-500/25 bg-rose-500/5 text-rose-400 hover:text-white hover:bg-rose-600/20 hover:border-rose-500 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Retry Connection
        </button>
      )}
    </div>
  );
}
