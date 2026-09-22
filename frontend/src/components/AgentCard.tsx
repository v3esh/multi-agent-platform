import React from "react";
import { type Agent } from "@/lib/api";

interface AgentCardProps {
  agent: Agent;
  onEdit?: () => void;
  onDelete?: () => void;
  onConnectReddit?: () => void;
  onDisconnectReddit?: () => void;
}

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  paused: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  stopped: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const dotStyles: Record<string, string> = {
  active: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]",
  paused: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]",
  stopped: "bg-slate-400",
};

export default function AgentCard({ agent, onEdit, onDelete, onConnectReddit, onDisconnectReddit }: AgentCardProps) {
  const status = agent.status || "stopped";
  const isRedditLinked = agent.reddit_linked && agent.reddit_username;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/5 p-6 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-300 group flex flex-col gap-4">
      {/* Hover glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Status dot */}
      <div className={`absolute top-5 right-5 w-2.5 h-2.5 rounded-full ${dotStyles[status] ?? dotStyles.stopped} animate-pulse`} />

      <div className="relative z-10 flex-1">
        <div className="flex items-start justify-between mb-3 pr-5">
          <h3 className="text-lg font-bold text-white tracking-tight leading-tight">{agent.name}</h3>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${statusStyles[status] ?? statusStyles.stopped} ml-2 shrink-0`}>
            {status.toUpperCase()}
          </span>
        </div>

        <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
          {agent.description || "No description provided."}
        </p>

        {/* Reddit Account Status */}
        <div className="mb-4 p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🔴</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Reddit Account</span>
              {isRedditLinked ? (
                <span className="text-xs font-bold text-emerald-400 font-mono">{agent.reddit_username}</span>
              ) : (
                <span className="text-xs text-amber-400/80 font-medium">Unlinked</span>
              )}
            </div>
          </div>
          {isRedditLinked ? (
            <button
              onClick={onDisconnectReddit}
              className="text-[10px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-lg transition-all"
            >
              Unlink
            </button>
          ) : (
            <button
              onClick={onConnectReddit}
              className="text-[10px] font-bold text-black bg-gradient-to-r from-orange-400 to-amber-500 hover:opacity-90 px-3 py-1 rounded-lg transition-all shadow-[0_0_10px_rgba(249,115,22,0.3)]"
            >
              + Link Reddit
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-0.5">Limit</span>
            <span className="text-gray-300 font-medium">{agent.frequency_limit}/day</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-0.5">Window</span>
            <span className="text-gray-300 font-medium">{agent.active_window || "24/7"}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="relative z-10 flex gap-2 pt-3 border-t border-white/5">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 py-2 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              ✏ Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex-1 py-2 text-xs font-semibold text-red-400 hover:text-white bg-red-500/5 hover:bg-red-500/20 rounded-lg transition-all duration-200"
            >
              🗑 Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
