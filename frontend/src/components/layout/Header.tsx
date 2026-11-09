import React from "react";
import { Terminal, Shield, Cpu, Activity } from "lucide-react";
import { useHealthCheck } from "../../hooks/useHealthCheck";
import { Badge } from "../common/Badge";

export const Header: React.FC = () => {
  const { data: health, isLoading } = useHealthCheck();

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="neutral">Connecting...</Badge>;
    }
    if (!health) {
      return <Badge variant="error">Offline</Badge>;
    }
    if (health.status === "healthy") {
      return (
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Backend Active ({health.database.latency_ms}ms)
        </Badge>
      );
    }
    return (
      <Badge variant="warning">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Degraded ({health.status})
      </Badge>
    );
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 tracking-tight text-base">
              XEROVA AI DEVFORCE
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              v0.1.0-alpha
            </span>
          </div>
          <p className="text-xs text-slate-400">Autonomous Engineering Workforce</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>Zero-Trust Sandbox</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Docker Isolated</span>
        </div>

        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" />
          {getStatusBadge()}
        </div>
      </div>
    </header>
  );
};

