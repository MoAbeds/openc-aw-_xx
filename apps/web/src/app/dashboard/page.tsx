"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import { useAuthStore } from "@/store/useAuthStore";
import { wsManager } from "@/lib/ws";
import { AgentNode } from "@/components/AgentNode";
import { AgentDetail } from "@/components/AgentDetail";
import { FleetLogFeed } from "@/components/FleetLogFeed";
import { Cpu, Plus } from "lucide-react";
import Link from "next/link";

export default function FleetDashboard() {
    const { agents, fetchAgents, updateAgentStatus, addLog } = useAgentStore();
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchAgents();

        if (!token) return;

        wsManager.connect(token);

        const handleStatusUpdate = (data: any) => {
            if (data.agentId && data.status) {
                updateAgentStatus(data.agentId, data.status);
            }
        };

        const handleGlobalLog = (data: any) => {
            if (data.agentId && data.message) {
                addLog({
                    id: Math.random().toString(36).slice(2),
                    agentId: data.agentId,
                    level: (data.level as any) || "info",
                    message: data.message,
                    createdAt: data.timestamp || new Date().toISOString()
                });
            }
        };

        wsManager.on("fleet:status", handleStatusUpdate);
        wsManager.on("agent:log", handleGlobalLog); // We might need a general log event or individual ones

        return () => {
            wsManager.off("fleet:status", handleStatusUpdate);
            wsManager.off("agent:log", handleGlobalLog);
        };
    }, [token, fetchAgents, updateAgentStatus, addLog]);

    // Root agents for the tree
    const rootAgents = agents.filter(a => !a.parentId);

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-white/5 bg-surface/20 glass ml-[-8px]">

            {/* LEFT PANEL: Agent Tree */}
            <div className="w-[260px] h-full border-r border-border bg-black/40 flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Fleet Hierarchy</h3>
                    <Link href="/dashboard/builder" className="p-1 hover:bg-accent-teal/20 rounded text-accent-teal transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {rootAgents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                            <Cpu className="w-8 h-8 animate-pulse" />
                            <p className="text-[10px] uppercase tracking-widest text-center">Unlinked Fleet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {rootAgents.map(agent => (
                                <AgentNode key={agent.id} agent={agent} level={0} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CENTER PANEL: Details */}
            <AgentDetail />

            {/* RIGHT PANEL: Fleet Logs */}
            <FleetLogFeed />

        </div>
    );
}
