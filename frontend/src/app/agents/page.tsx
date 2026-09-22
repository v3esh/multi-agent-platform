"use client";
import { useEffect, useState, useCallback } from "react";
import { agentsApi, redditApi, permissionsApi, logout, type Agent, type AgentCreate, type PermissionProfile } from "@/lib/api";
import AgentCard from "@/components/AgentCard";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const defaultForm: AgentCreate = {
  name: "",
  description: "",
  status: "active",
  active_window: "",
  frequency_limit: 10,
  permission_profile_id: undefined,
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<AgentCreate>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Reddit Connect Modal State
  const [redditModalAgent, setRedditModalAgent] = useState<Agent | null>(null);
  const [redditUsernameInput, setRedditUsernameInput] = useState("");
  const [connectingReddit, setConnectingReddit] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const [data, profileData] = await Promise.all([
        agentsApi.list(),
        permissionsApi.listProfiles().catch(() => [])
      ]);
      setAgents(data);
      setProfiles(profileData);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    
    // Check if returning from Reddit OAuth redirect
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reddit_linked") === "true") {
        const username = params.get("username") || "Reddit User";
        setToastMessage(`✅ Successfully linked Reddit account: ${username}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [fetchAgents]);

  function openCreate() {
    setEditingAgent(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(agent: Agent) {
    setEditingAgent(agent);
    setForm({
      name: agent.name,
      description: agent.description || "",
      status: agent.status,
      active_window: agent.active_window || "",
      frequency_limit: agent.frequency_limit,
      permission_profile_id: agent.permission_profile_id,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAgent) {
        await agentsApi.update(editingAgent.id, form);
      } else {
        await agentsApi.create(form);
      }
      setShowModal(false);
      fetchAgents();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await agentsApi.delete(id);
      setDeleteConfirm(null);
      fetchAgents();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  // Reddit Connection Handlers
  function openRedditConnect(agent: Agent) {
    setRedditModalAgent(agent);
    setRedditUsernameInput(agent.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_bot");
  }

  async function handleOAuthLogin(agentId: number) {
    try {
      const { url } = await redditApi.getAuthUrl(agentId);
      window.location.href = url;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to initiate Reddit OAuth");
    }
  }

  async function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!redditModalAgent || !redditUsernameInput.trim()) return;
    try {
      setConnectingReddit(true);
      await redditApi.connectAccount(redditModalAgent.id, redditUsernameInput);
      setRedditModalAgent(null);
      setToastMessage(`✅ Successfully linked Reddit account: ${redditUsernameInput}`);
      fetchAgents();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to connect Reddit account");
    } finally {
      setConnectingReddit(false);
    }
  }

  async function handleDisconnectReddit(agent: Agent) {
    if (!confirm(`Unlink Reddit account for ${agent.name}?`)) return;
    try {
      await redditApi.disconnectAccount(agent.id);
      setToastMessage(`Disconnected Reddit account for ${agent.name}`);
      fetchAgents();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to disconnect account");
    }
  }

  async function handleBulkStatus(targetStatus: string) {
    const confirmMsg = targetStatus === "paused"
      ? "🚨 EMERGENCY KILL-SWITCH: Pause ALL agents across the platform?"
      : `Bulk set status of ALL agents to '${targetStatus.toUpperCase()}'?`;
    if (!confirm(confirmMsg)) return;
    try {
      const res = await agentsApi.bulkStatus(targetStatus);
      setToastMessage(`🛡️ Central Safeguard: ${res.message}`);
      fetchAgents();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Bulk status update failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
              Agents
            </h1>
            <p className="text-gray-400">Manage and monitor your AI personas & connected Reddit accounts.</p>
          </div>
          <button
            id="new-agent-btn"
            onClick={openCreate}
            className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 hover:scale-105 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            + New Agent
          </button>
        </header>

        {/* Phase 3 Central Safeguards Control Bar */}
        <section className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🛡️</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Central Safeguards & System Controls</h2>
            </div>
            <p className="text-xs text-gray-400">Emergency kill-switch and bulk operational controls across all agents.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleBulkStatus("active")}
              className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>▶️</span> Resume All
            </button>
            <button
              onClick={() => handleBulkStatus("paused")}
              className="flex-1 md:flex-none px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>⏸️</span> Emergency Pause All
            </button>
            <button
              onClick={() => handleBulkStatus("stopped")}
              className="flex-1 md:flex-none px-4 py-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border border-slate-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>⏹️</span> Stop All
            </button>
          </div>
        </section>

        {toastMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 mb-6 flex justify-between items-center">
            <span className="text-sm font-medium">{toastMessage}</span>
            <button onClick={() => setToastMessage("")} className="text-xs text-gray-400 hover:text-white">&times;</button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {!loading && agents.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-bold text-white mb-2">No agents yet</h2>
            <p className="text-gray-500 mb-6">Create your first AI agent to get started.</p>
            <button onClick={openCreate} className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors">
              Create First Agent
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={() => openEdit(agent)}
              onDelete={() => setDeleteConfirm(agent.id)}
              onConnectReddit={() => openRedditConnect(agent)}
              onDisconnectReddit={() => handleDisconnectReddit(agent)}
            />
          ))}
        </div>
      </div>

      {/* Connect Reddit Modal */}
      {redditModalAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-orange-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-orange-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔴</span>
                <div>
                  <h2 className="text-lg font-bold text-white">Connect Reddit Account</h2>
                  <p className="text-xs text-gray-400">Agent: <span className="text-white font-semibold">{redditModalAgent.name}</span></p>
                </div>
              </div>
              <button onClick={() => setRedditModalAgent(null)} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Method 1: Official OAuth */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-1">Option 1: Official Reddit OAuth2</h3>
                <p className="text-xs text-gray-400 mb-3">Authenticate with Reddit's official OAuth authorization endpoint.</p>
                <button
                  onClick={() => handleOAuthLogin(redditModalAgent.id)}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-black font-bold text-xs rounded-lg hover:opacity-90 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2"
                >
                  <span>🔴 Connect via Reddit OAuth</span>
                </button>
              </div>

              {/* Method 2: Dev/Staging Quick Link */}
              <form onSubmit={handleManualConnect} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Option 2: Direct Handle Link (Dev/Testing)</h3>
                <p className="text-xs text-gray-400">Associate an authorized Reddit username directly with this agent.</p>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Reddit Username</label>
                  <input
                    required
                    value={redditUsernameInput}
                    onChange={(e) => setRedditUsernameInput(e.target.value)}
                    placeholder="e.g. u/Crypto_Scout_Bot"
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-blue-500/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={connectingReddit}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs rounded-lg transition-all disabled:opacity-50"
                >
                  {connectingReddit ? "Linking Account..." : "Confirm Reddit Link"}
                </button>
              </form>
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10 text-right">
              <button onClick={() => setRedditModalAgent(null)} className="px-4 py-2 text-xs text-gray-400 hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">{editingAgent ? "Edit Agent" : "New Agent"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Alex (Tech News)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this agent do?"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60 transition-all"
                  >
                    <option value="active" className="bg-[#1a1a1a] text-white">Active</option>
                    <option value="paused" className="bg-[#1a1a1a] text-white">Paused</option>
                    <option value="stopped" className="bg-[#1a1a1a] text-white">Stopped</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actions/Day</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.frequency_limit}
                    onChange={(e) => setForm({ ...form, frequency_limit: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Permission Profile</label>
                <select
                  value={form.permission_profile_id || ""}
                  onChange={(e) => setForm({ ...form, permission_profile_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60 transition-all"
                >
                  <option value="" className="bg-[#1a1a1a] text-gray-400">Standard (Human-in-the-Loop default)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#1a1a1a] text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Window</label>
                <input
                  value={form.active_window}
                  onChange={(e) => setForm({ ...form, active_window: e.target.value })}
                  placeholder="e.g. 09:00-17:00 or 24/7"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-100 disabled:opacity-50 transition-all">
                  {saving ? "Saving…" : editingAgent ? "Save Changes" : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-red-500/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold mb-2">Delete Agent?</h2>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
