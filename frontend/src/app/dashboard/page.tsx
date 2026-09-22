"use client";
import { useEffect, useState, useCallback } from "react";
import { agentsApi, type Agent } from "@/lib/api";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCycle, setRunningCycle] = useState(false);
  const [cycleResult, setCycleResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await agentsApi.list();
      setAgents(data);
    } catch {
      // silently fail; auth guard handles 401
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleTriggerCycles() {
    try {
      setRunningCycle(true);
      setCycleResult(null);
      const summary = await agentsApi.runCycles();
      setCycleResult(
        `⚡ Executed Celery cycle for ${summary.total_agents} active agents (${summary.queued_approvals} action(s) queued for admin approval, ${summary.auto_executed} auto-posted, ${summary.skipped} skipped)`
      );
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Cycle trigger failed");
    } finally {
      setRunningCycle(false);
    }
  }

  const active = agents.filter((a) => a.status === "active").length;
  const paused = agents.filter((a) => a.status === "paused").length;
  const stopped = agents.filter((a) => a.status === "stopped").length;
  const totalLimit = agents.reduce((sum, a) => sum + (a.frequency_limit || 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8">
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                Command Center
              </h1>
              {!loading && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="text-gray-400">System overview, automated Celery scheduling, and real-time monitoring.</p>
          </div>
          <button
            onClick={handleTriggerCycles}
            disabled={runningCycle}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 font-bold text-xs rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 whitespace-nowrap"
          >
            {runningCycle ? "⚡ Processing Agent Actions..." : "⚡ Run Scheduled Cycles Now"}
          </button>
        </header>

        {cycleResult && (
          <div className="bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-xl p-4 mb-8 flex justify-between items-center">
            <span className="text-xs font-mono font-semibold">{cycleResult}</span>
            <button onClick={() => setCycleResult(null)} className="text-xs text-gray-400 hover:text-white">&times;</button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard label="Total Agents" loading={loading}>
            <span className="text-4xl font-bold">{agents.length}</span>
            <div className="flex gap-3 text-xs font-semibold mt-1">
              <span className="text-emerald-400">{active} Active</span>
              <span className="text-amber-400">{paused} Paused</span>
              <span className="text-slate-400">{stopped} Stopped</span>
            </div>
          </StatCard>

          <StatCard label="Active Agents" loading={loading}>
            <span className="text-4xl font-bold text-emerald-400">{active}</span>
            <span className="text-xs text-gray-500 mt-1">Currently running</span>
          </StatCard>

          <StatCard label="Total Daily Limit" loading={loading}>
            <span className="text-4xl font-bold text-blue-400">{totalLimit}</span>
            <span className="text-xs text-gray-500 mt-1">Max actions/day across all agents</span>
          </StatCard>

          <StatCard label="Platform Status" loading={loading}>
            <span className="text-2xl font-bold text-emerald-400">Online</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-500">Celery Daemon & Worker Active</span>
            </div>
          </StatCard>
        </div>

        {/* Agents Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md overflow-hidden mb-8">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold">Agent Overview</h2>
            <Link href="/agents" className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Manage Agents →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="mb-3">No agents created yet.</p>
              <Link href="/agents" className="text-blue-400 hover:underline text-sm">Create your first agent →</Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      agent.status === "active" ? "bg-emerald-400 animate-pulse" :
                      agent.status === "paused" ? "bg-amber-400" : "bg-slate-500"
                    }`} />
                    <div>
                      <span className="font-semibold text-white">{agent.name}</span>
                      {agent.description && (
                        <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{agent.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <span className="text-xs text-gray-500">Window</span>
                      <p className="text-sm text-gray-300">{agent.active_window || "24/7"}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <span className="text-xs text-gray-500">Limit</span>
                      <p className="text-sm text-gray-300">{agent.frequency_limit}/day</p>
                    </div>
                    <span className={`text-xs font-bold tracking-wider px-3 py-1 rounded-full border ${
                      agent.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      agent.status === "paused" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Access Modules */}
        <h2 className="text-xl font-bold mb-4">Platform Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <QuickLink
            href="/agents"
            icon="🤖"
            title="Manage Agents"
            desc="Create, edit, and configure your active AI agents"
          />
          <QuickLink
            href="/personas"
            icon="🎭"
            title="AI Persona Engine"
            desc="Synthesize & generate custom AI agent personas"
          />
          <QuickLink
            href="/approvals"
            icon="🛡️"
            title="Permissions & Approvals"
            desc="Review & approve pending AI agent actions"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            href="/logs"
            icon="📋"
            title="Audit & Activity Logs"
            desc="Detailed audit logs and execution history"
          />
          <QuickLink
            href="http://localhost:8000/docs"
            icon="📡"
            title="API Explorer"
            desc="Browse REST API documentation via Swagger"
            external
          />
          <QuickLink
            href="http://localhost:8080"
            icon="🗄️"
            title="Database Viewer"
            desc="Inspect Postgres DB tables via Adminer"
            external
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, children, loading }: { label: string; children: React.ReactNode; loading: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-1">
      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{label}</h3>
      {loading ? (
        <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
      ) : (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  );
}

function QuickLink({ href, icon, title, desc, external }: { href: string; icon: string; title: string; desc: string; external?: boolean }) {
  const inner = (
    <>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-white group-hover:text-blue-300 transition-colors">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </>
  );
  const cls = "group bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 hover:bg-white/10";
  if (external) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  }
  return <Link href={href} className={cls}>{inner}</Link>;
}
