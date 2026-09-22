"use client";
import { useEffect, useState, useCallback } from "react";
import { permissionsApi, type PermissionProfile, type PermissionRule } from "@/lib/api";
import Navbar from "@/components/Navbar";

export default function PermissionsPage() {
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [profileName, setProfileName] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [commentApproval, setCommentApproval] = useState(true);
  const [commentLimit, setCommentLimit] = useState(15);
  const [publishApproval, setPublishApproval] = useState(true);
  const [publishLimit, setPublishLimit] = useState(10);
  const [searchApproval, setSearchApproval] = useState(false);
  const [searchLimit, setSearchLimit] = useState(100);
  const [saving, setSaving] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await permissionsApi.listProfiles();
      setProfiles(data);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load permission profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim()) return;
    try {
      setSaving(true);
      const permissions: PermissionRule[] = [
        { action_type: "comment", requires_approval: commentApproval, daily_limit: commentLimit },
        { action_type: "publish", requires_approval: publishApproval, daily_limit: publishLimit },
        { action_type: "search", requires_approval: searchApproval, daily_limit: searchLimit },
      ];
      await permissionsApi.createProfile({
        name: profileName,
        description: profileDesc,
        permissions,
      });
      setShowModal(false);
      setProfileName("");
      setProfileDesc("");
      fetchProfiles();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to create profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProfile(id: number) {
    if (!confirm("Delete this permission profile?")) return;
    try {
      await permissionsApi.deleteProfile(id);
      fetchProfiles();
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
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-600 mb-2">
              Permission Profiles & Capabilities
            </h1>
            <p className="text-gray-400">Define default & custom action governance rules, daily rate limits, and approval gating.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-bold rounded-xl hover:opacity-90 transition-all shadow-[0_0_20px_rgba(52,211,153,0.2)]"
          >
            + New Capability Profile
          </button>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">{error}</div>
        )}

        {!loading && profiles.length === 0 && !error && (
          <div className="text-center py-16 bg-[#111] border border-white/10 rounded-2xl">
            <div className="text-4xl mb-2">🛡️</div>
            <p className="text-gray-400">No capability profiles configured yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.map((prof) => (
            <div key={prof.id} className="bg-[#111] border border-white/10 rounded-2xl p-6 shadow-xl relative flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">{prof.name}</h3>
                  <button
                    onClick={() => handleDeleteProfile(prof.id)}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">{prof.description || "No description provided."}</p>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">Action Governance Rules</span>
                  {prof.permissions && prof.permissions.length > 0 ? (
                    <div className="space-y-1.5">
                      {prof.permissions.map((rule, idx) => (
                        <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400 uppercase">{rule.action_type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rule.requires_approval ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}>
                              {rule.requires_approval ? "Approval Required" : "Auto Allowed"}
                            </span>
                            <span className="text-gray-400 text-[10px]">Limit: {rule.daily_limit}/day</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No specific rules defined.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-emerald-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-transparent">
              <h2 className="text-lg font-bold text-white">Create Capability Profile</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleCreateProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Profile Name *</label>
                <input
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. High-Trust Auto Poster"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={profileDesc}
                  onChange={(e) => setProfileDesc(e.target.value)}
                  placeholder="Describe governance tier and agent group target..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60 resize-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">Rule Configurations</span>

                {/* Comment Rule */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-white block">Comment Action</span>
                    <span className="text-[10px] text-gray-400">Replying to subreddits</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={commentApproval}
                        onChange={(e) => setCommentApproval(e.target.checked)}
                        className="rounded bg-black border-white/20 text-emerald-500"
                      />
                      Gated Approval
                    </label>
                    <input
                      type="number"
                      value={commentLimit}
                      onChange={(e) => setCommentLimit(Number(e.target.value))}
                      className="w-16 bg-black border border-white/10 rounded px-2 py-1 text-center text-xs text-white"
                    />
                  </div>
                </div>

                {/* Publish Rule */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-white block">Publish Action</span>
                    <span className="text-[10px] text-gray-400">Creating new posts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={publishApproval}
                        onChange={(e) => setPublishApproval(e.target.checked)}
                        className="rounded bg-black border-white/20 text-emerald-500"
                      />
                      Gated Approval
                    </label>
                    <input
                      type="number"
                      value={publishLimit}
                      onChange={(e) => setPublishLimit(Number(e.target.value))}
                      className="w-16 bg-black border border-white/10 rounded px-2 py-1 text-center text-xs text-white"
                    />
                  </div>
                </div>

                {/* Search Rule */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-bold text-white block">Search Action</span>
                    <span className="text-[10px] text-gray-400">Browsing & scraping subreddits</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={searchApproval}
                        onChange={(e) => setSearchApproval(e.target.checked)}
                        className="rounded bg-black border-white/20 text-emerald-500"
                      />
                      Gated Approval
                    </label>
                    <input
                      type="number"
                      value={searchLimit}
                      onChange={(e) => setSearchLimit(Number(e.target.value))}
                      className="w-16 bg-black border border-white/10 rounded px-2 py-1 text-center text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-xs font-semibold hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-400 text-black font-bold text-xs hover:bg-emerald-300 disabled:opacity-50 transition-all">
                  {saving ? "Saving..." : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
