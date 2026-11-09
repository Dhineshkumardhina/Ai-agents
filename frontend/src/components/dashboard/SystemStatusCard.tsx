import React from "react";
import { useHealthCheck } from "../../hooks/useHealthCheck";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Database, Server, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export const SystemStatusCard: React.FC = () => {
  const { data: health, isLoading, error, refetch, isFetching } = useHealthCheck();

  return (
    <Card
      title="System Architecture & Service Health"
      subtitle="Real-time telemetry and database connectivity status"
      action={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition disabled:opacity-50"
          title="Refresh health status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      }
    >
      {isLoading ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          Polling system health status...
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Backend Connection Failed</div>
            <div className="text-xs text-rose-300 mt-1">
              Ensure FastAPI backend is running at http://localhost:8000
            </div>
          </div>
        </div>
      ) : health ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                <Server className="w-4 h-4 text-blue-400" />
                <span>FastAPI Service</span>
              </div>
              <Badge variant={health.status === "healthy" ? "success" : "warning"}>
                {health.status}
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-mono text-slate-300">{health.version}</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="capitalize text-slate-300">{health.environment}</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-mono text-slate-300">{health.uptime_seconds}s</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>PostgreSQL 16+</span>
              </div>
              <Badge variant={health.database.connected ? "success" : "error"}>
                {health.database.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-mono text-slate-300">{health.database.latency_ms} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Engine:</span>
                <span className="text-slate-300">asyncpg + pgvector</span>
              </div>
              {health.database.error && (
                <div className="text-xs text-rose-400 truncate">
                  Error: {health.database.error}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Empirical Execution Engine Initialized</span>
        </div>
        <span className="text-slate-500 font-mono">React 19 + TypeScript + Vite</span>
      </div>
    </Card>
  );
};

