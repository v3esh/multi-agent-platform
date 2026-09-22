"use client";
import { useEffect, useState, useCallback } from "react";
import { logsApi, logout, type ActivityLog } from "@/lib/api";
import Link from "next/link";

import Navbar from "@/components/Navbar";

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await logsApi.list();
      setLogs(data);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8">
        <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-600 mb-2">
              Audit & Activity Stream
            </h1>
            <p className="text-gray-400">Complete, timestamped audit trail of agent executions and system decisions.</p>
          </div>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/10 transition-all"
          >
            🔄 Refresh Logs
          </button>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">{error}</div>
        )}

        {!loading && logs.length === 0 && !error && (
          <div className="text-center py-16 bg-[#111] border border-white/10 rounded-2xl">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-gray-400">No activity logs recorded yet.</p>
          </div>
        )}

        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Agent ID</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors font-mono">
                  <td className="p-4 text-gray-400 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                  </td>
                  <td className="p-4 text-gray-300">
                    {log.agent_id ? `#${log.agent_id}` : "System"}
                  </td>
                  <td className="p-4 font-semibold text-cyan-400">
                    {log.action_type}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      log.status === "success" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      log.status === "pending" || log.status === "pending_approval" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 max-w-md truncate">
                    {log.details || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
