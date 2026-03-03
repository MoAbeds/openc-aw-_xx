"use client";

import { useEffect, useState } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import { useAuthStore } from "@/store/useAuthStore";
import { wsManager } from "@/lib/ws";
import { AgentNode } from "@/components/AgentNode";
import { AgentDetail } from "@/components/AgentDetail";
import { FleetLogFeed } from "@/components/FleetLogFeed";
import { Cpu, Plus, Layers, MessageSquare, Info } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function FleetDashboard() {
    const { agents, fetchAgents, updateAgentStatus, addLog, addDelegationEvent } = useAgentStore();
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

        const handleDelegation = (data: any) => {
            if (data.payload) {
                addDelegationEvent(data.payload);
            }
        };

        wsManager.on("fleet:status", handleStatusUpdate);
        wsManager.on("agent:log", handleGlobalLog);
        wsManager.on("delegation_event", handleDelegation);

        return () => {
            wsManager.off("fleet:status", handleStatusUpdate);
            wsManager.off("agent:log", handleGlobalLog);
            wsManager.off("delegation_event", handleDelegation);
        };
    }, [token, fetchAgents, updateAgentStatus, addLog]);

    // Root agents for the tree
    const rootAgents = agents.filter(a => !a.parentId);
    const [activeTab, setActiveTab] = useState<'fleet' | 'details' | 'logs'>('fleet');

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] md:h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-white/5 bg-surface/20 glass md:ml-[-8px]">
            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden bg-black/40 border-b border-white/5 p-1 gap-1">
                {(['fleet', 'details', 'logs'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 py-2 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all capitalize",
                            activeTab === tab ? "bg-accent-teal/20 text-accent-teal shadow-[0_0_15px_rgba(0,255,209,0.1)]" : "text-muted"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* LEFT PANEL: Agent Tree */}
                {(activeTab === 'fleet' || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                    <motion.div
                        key="fleet"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={cn(
                            "w-full md:w-[260px] h-full border-r border-border bg-black/40 flex flex-col",
                            activeTab !== 'fleet' && "hidden md:flex"
                        )}
                    >
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
                    </motion.div>
                )}

                {/* CENTER PANEL: Details */}
                {(activeTab === 'details' || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className={cn("flex-1 h-full overflow-hidden", activeTab !== 'details' && "hidden md:block")}
                    >
                        <AgentDetail />
                    </motion.div>
                )}

                {/* RIGHT PANEL: Fleet Logs */}
                {(activeTab === 'logs' || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
                    <motion.div
                        key="logs"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn(
                            "w-full md:w-[320px] h-full border-l border-border bg-black/40",
                            activeTab !== 'logs' && "hidden md:block"
                        )}
                    >
                        <FleetLogFeed />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
