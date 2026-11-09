import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  GitBranch,
  Bot,
  Terminal,
  ShieldCheck,
  FolderGit2,
  Settings,
  Database,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Task DAG", href: "/tasks", icon: GitBranch },
    { name: "Agent Roster", href: "/agents", icon: Bot },
    { name: "Execution Sandboxes", href: "/sandboxes", icon: Terminal },
    { name: "Governance & Audit", href: "/governance", icon: ShieldCheck },
    { name: "Repositories", href: "/repositories", icon: FolderGit2 },
    { name: "Vector Memory", href: "/memory", icon: Database },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between shrink-0">
      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Control Plane
        </div>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800/80 pt-4 px-3 text-xs text-slate-500">
        <div>Architecture: Phase 1A</div>
        <div className="text-[10px] text-slate-600 mt-0.5">Empirical Evidence Engine</div>
      </div>
    </aside>
  );
};

