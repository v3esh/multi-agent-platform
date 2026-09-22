"use client";
import { useEffect, useState, useCallback } from "react";
import { personasApi, agentsApi, type Persona, type Agent } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // AI Generation State
  const [baseDescription, setBaseDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>(undefined);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [personaData, agentData] = await Promise.all([
        personasApi.list(),
        agentsApi.list().catch(() => [])
      ]);
      setPersonas(personaData);
      setAgents(agentData);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load personas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAIGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!baseDescription.trim()) return;
    try {
      setGenerating(true);
      await personasApi.generate(baseDescription, selectedAgentId);
      setBaseDescription("");
      setSelectedAgentId(undefined);
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAssignAgent(personaId: number, agentId?: number) {
    try {
      const persona = personas.find(p => p.id === personaId);
      if (!persona) return;
      await personasApi.update(personaId, {
        name: persona.name,
        personality: persona.personality,
        agent_id: agentId,
      });
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Assignment failed");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this persona?")) return;
    try {
      await personasApi.delete(id);
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8">
        <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
              AI Persona Engine
            </h1>
            <p className="text-gray-400">Synthesize communication styles and assign AI behavioral profiles directly to your agents.</p>
          </div>
        </header>

        {/* AI Assisted Generator */}
        <section className="bg-[#111] border border-purple-500/20 rounded-2xl p-6 mb-10 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <h2 className="text-lg font-bold text-purple-400 mb-2">✨ AI-Assisted Persona Creation</h2>
          <p className="text-xs text-gray-400 mb-4">Enter a concept prompt and select which Agent to assign this persona to.</p>

          <form onSubmit={handleAIGenerate} className="flex flex-col md:flex-row gap-4">
            <input
              required
              value={baseDescription}
              onChange={(e) => setBaseDescription(e.target.value)}
              placeholder="e.g. Senior Open-Source Python Developer who loves async frameworks..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60"
            />
            <select
              value={selectedAgentId || ""}
              onChange={(e) => setSelectedAgentId(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/60 md:w-64"
            >
              <option value="" className="bg-[#1a1a1a] text-gray-400">🤖 Assign to Agent (Optional)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#1a1a1a] text-white">
                  {a.name} (ID: {a.id})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={generating}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 font-bold rounded-xl hover:opacity-90 transition-all text-sm whitespace-nowrap disabled:opacity-50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
            >
              {generating ? "Synthesizing..." : "Generate & Assign Persona"}
            </button>
          </form>
        </section>

        {/* Personas Grid */}
        <h2 className="text-xl font-bold mb-4">Active Personas</h2>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">{error}</div>
        )}

        {!loading && personas.length === 0 && !error && (
          <div className="text-center py-16 bg-[#111] border border-white/10 rounded-2xl">
            <div className="text-4xl mb-2">🎭</div>
            <p className="text-gray-400">No personas created yet. Generate one above!</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((p) => {
            const assignedAgent = agents.find(a => a.id === p.agent_id);
            return (
              <div key={p.id} className="bg-[#111] border border-white/10 rounded-2xl p-6 shadow-xl relative group">
                <button
                  onClick={() => handleDelete(p.id)}
                  className="absolute top-4 right-4 text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>

                <h3 className="text-lg font-bold text-white mb-2">{p.name}</h3>

                {/* Assigned Agent Control */}
                <div className="mb-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span>🤖</span>
                    <span className="text-gray-400">Assigned Agent:</span>
                    <span className="font-bold text-purple-400">
                      {assignedAgent ? assignedAgent.name : "Unassigned (General Pool)"}
                    </span>
                  </div>
                  <select
                    value={p.agent_id || ""}
                    onChange={(e) => handleAssignAgent(p.id, e.target.value ? Number(e.target.value) : undefined)}
                    className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500/60"
                  >
                    <option value="" className="bg-[#1a1a1a] text-gray-400">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id} className="bg-[#1a1a1a] text-white">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 text-xs text-gray-300">
                  <div>
                    <span className="font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">Personality:</span>
                    <p>{p.personality || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">Communication Style:</span>
                    <p>{p.communication_style || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">Interests:</span>
                    <p>{p.interests || "N/A"}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
