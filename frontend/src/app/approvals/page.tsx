"use client";
import { useEffect, useState, useCallback } from "react";
import { approvalsApi, redditApi, agentsApi, logout, type Approval, type Agent } from "@/lib/api";
import Link from "next/link";

import Navbar from "@/components/Navbar";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // New Comment Form
  const [selectedAgentId, setSelectedAgentId] = useState<number>(0);
  const [submissionId, setSubmissionId] = useState("t3_tech1");
  const [commentContent, setCommentContent] = useState("");
  const [postStatus, setPostStatus] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [appData, agentData] = await Promise.all([
        approvalsApi.list(),
        agentsApi.list(),
      ]);
      setApprovals(appData);
      setAgents(agentData);
      if (agentData.length > 0 && selectedAgentId === 0) {
        setSelectedAgentId(agentData[0].id);
      }
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleApprove(id: number) {
    try {
      setProcessingId(id);
      await approvalsApi.approve(id);
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: number) {
    try {
      setProcessingId(id);
      await approvalsApi.reject(id);
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgentId) return alert("Please select an agent");
    try {
      setPostStatus("Submitting...");
      const res = await redditApi.postComment(selectedAgentId, submissionId, commentContent);
      if (res.status === "pending_approval") {
        setPostStatus("✨ Action intercepted by Policy Engine! Permission request created below.");
      } else {
        setPostStatus("✅ Comment posted directly to Reddit API!");
      }
      setCommentContent("");
      fetchData();
    } catch (e: unknown) {
      setPostStatus(`Error: ${e instanceof Error ? e.message : "Post failed"}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8">
        <header className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600 mb-2">
              Permissions & Approvals
            </h1>
            <p className="text-gray-400">Review AI-generated comments and actions before publication on Reddit.</p>
          </div>
        </header>

        {/* Test Interactive Action */}
        <section className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-10 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-2">🚀 Simulate Agent Action / Reddit Comment</h2>
          <p className="text-xs text-gray-400 mb-4">Submit a comment via an agent to trigger policy evaluation and optional approval gating.</p>
          
          <form onSubmit={handlePostComment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Agent</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/60"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id} className="bg-[#1a1a1a] text-white py-1">
                      {a.name} (ID: {a.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reddit Thread ID</label>
                <input
                  value={submissionId}
                  onChange={(e) => setSubmissionId(e.target.value)}
                  placeholder="e.g. t3_tech1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/60"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comment Content</label>
              <textarea
                required
                rows={2}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Enter agent comment text..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/60 resize-none"
              />
            </div>
            <div className="flex justify-between items-center">
              <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 font-bold rounded-xl hover:opacity-90 transition-all text-sm">
                Dispatch Action via Policy Engine
              </button>
              {postStatus && <span className="text-xs font-medium text-amber-400">{postStatus}</span>}
            </div>
          </form>
        </section>

        {/* Approvals Table */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📋 Pending & Historical Approvals</span>
        </h2>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">{error}</div>
        )}

        {!loading && approvals.length === 0 && !error && (
          <div className="text-center py-16 bg-[#111] border border-white/10 rounded-2xl">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-gray-400">No approval requests pending.</p>
          </div>
        )}

        <div className="space-y-4">
          {approvals.map((item) => (
            <div key={item.id} className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                    item.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    item.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Agent #{item.agent_id}</span>
                  <span className="text-xs text-gray-500">Action: {item.action_type}</span>
                </div>
                <p className="text-white font-medium text-sm pt-2">{item.proposed_content}</p>
                <p className="text-xs text-gray-500">Requested at: {item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}</p>
              </div>

              {item.status === "pending" && (
                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    disabled={processingId === item.id}
                    onClick={() => handleReject(item.id)}
                    className="flex-1 md:flex-none px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-all"
                  >
                    Reject
                  </button>
                  <button
                    disabled={processingId === item.id}
                    onClick={() => handleApprove(item.id)}
                    className="flex-1 md:flex-none px-5 py-2 rounded-xl bg-green-500 text-black text-sm font-bold hover:bg-green-400 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    Approve & Post
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
