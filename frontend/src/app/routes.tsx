import React from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "../components/layout/Layout";
import { SystemStatusCard } from "../components/dashboard/SystemStatusCard";
import { Card } from "../components/common/Card";
import { Layers, Terminal, Shield, GitCommit } from "lucide-react";

const DashboardOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
          Workforce Mission Control
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Autonomous multi-agent software engineering coordination platform.
        </p>
      </div>

      <SystemStatusCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Master Orchestrator"
          subtitle="Campaign & DAG Planner"
        >
          <div className="flex items-center gap-3 text-slate-400 text-sm py-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Topological task breakdown and dependency dispatching.</span>
          </div>
        </Card>

        <Card
          title="Sandbox Execution"
          subtitle="Docker & OS Sandboxes"
        >
          <div className="flex items-center gap-3 text-slate-400 text-sm py-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>Isolated container workspaces with zero host execution.</span>
          </div>
        </Card>

        <Card
          title="Governance Gate"
          subtitle="Blast-Radius Policy"
        >
          <div className="flex items-center gap-3 text-slate-400 text-sm py-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span>Cryptographic sign-offs on high-impact actions.</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{title}</h1>
      <p className="text-sm text-slate-400 mt-1">{description}</p>
    </div>
    <Card>
      <div className="py-12 text-center text-slate-500 text-sm">
        <GitCommit className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <div>Module foundation initialized for Phase 1A.</div>
        <div className="text-xs text-slate-600 mt-1">
          Agent capabilities and runtime executors will be connected in subsequent phases.
        </div>
      </div>
    </Card>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardOverview />} />
        <Route
          path="tasks"
          element={
            <PlaceholderPage
              title="Task Dependency Graph"
              description="Visual DAG of tasks with real-time dependency resolution and status."
            />
          }
        />
        <Route
          path="agents"
          element={
            <PlaceholderPage
              title="Agent Roster & Personas"
              description="Product Manager, Architect, Staff SWE, QA, Security, and DevOps agents."
            />
          }
        />
        <Route
          path="sandboxes"
          element={
            <PlaceholderPage
              title="Docker Execution Sandboxes"
              description="Live terminal streams, cgroup limits, and empirical test execution evidence."
            />
          }
        />
        <Route
          path="governance"
          element={
            <PlaceholderPage
              title="Governance & Tamper-Evident Audits"
              description="Human-in-the-loop approval requests and cryptographic SHA-256 audit logs."
            />
          }
        />
        <Route
          path="repositories"
          element={
            <PlaceholderPage
              title="Project Repositories"
              description="Multi-repository workspace linkage and branch isolation."
            />
          }
        />
        <Route
          path="memory"
          element={
            <PlaceholderPage
              title="Vector Memory & Architecture ADRs"
              description="pgvector code chunks, AST symbol index, and non-negotiable architecture decisions."
            />
          }
        />
        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="Platform Settings"
              description="Workspace configurations, API provider keys, and security controls."
            />
          }
        />
      </Route>
    </Routes>
  );
};

