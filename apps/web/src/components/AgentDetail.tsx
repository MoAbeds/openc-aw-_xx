"use client";

import { useAgentStore } from "@/store/useAgentStore";
import { cn } from "@/lib/utils";
import {
    Zap,
    Settings2,
    Database,
    FileText,
    Plus,
    Activity,
    Cpu,
    Clock,
    Layers,
    Terminal
} from "lucide-react";
import { useState } from "react";

const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "skills", label: "Skills", icon: Zap },
    { id: "memory", label: "Memory", icon: Database },
    { id: "logs", label: "Logs", icon: Terminal },
];

export function AgentDetail() {
    const { agents, selectedAgentId } = useAgentStore();
    const [activeTab, setActiveTab] = useState("overview");

    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center opacity-20">
                    <Cpu className="w-12 h-12 mx-auto mb-4" />
                    <p className="uppercase tracking-[0.4em] text-xs">Awaiting Target Selection</p>
                </div>
            </div>
        );
    }

    const subAgents = agents.filter(a => a.parentId === agent.id);

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
            {/* Agent Header */}
            <div className="p-8 border-b border-white/5 space-y-6">
                <div className="flex items-start justify-between">
                    <div className="flex gap-6">
                        <div className="w-20 h-20 rounded-2xl border border-white/10 p-1 bg-surface-secondary/50">
                            <div className="w-full h-full rounded-[inherit] bg-background border border-accent-teal/20 flex items-center justify-center">
                                {agent.avatar ? <img src={agent.avatar} alt="" /> : <Cpu className="w-8 h-8 text-accent-teal/50" />}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-display italic tracking-tight">{agent.name}</h1>
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold tracking-tighter uppercase",
                                    agent.status === 'active' ? 'bg-accent-teal/10 text-accent-teal' : 'bg-muted/10 text-muted'
                                )}>
                                    {agent.status}
                                </div>
                            </div>
                            <p className="text-muted text-sm tracking-widest uppercase">{agent.role}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-2 text-[10px] text-accent-purple font-mono">
                                    <Layers className="w-3 h-3" />
                                    <span>{agent.model}</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
                                    <Clock className="w-3 h-3" />
                                    <span>Updated 2m ago</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-surface border border-white/5 rounded text-[10px] font-bold uppercase tracking-widest hover:border-accent-teal/30 transition-colors">
                            Remote Link
                        </button>
                        <button className="p-2 bg-surface border border-white/5 rounded hover:border-accent-orange/30 transition-colors">
                            <Settings2 className="w-4 h-4 text-muted" />
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: "Uptime", value: "99.9%", icon: Activity },
                        { label: "Tasks", value: "482", icon: FileText },
                        { label: "Memory", value: "1.2gb", icon: Database },
                        { label: "Sub-Agents", value: subAgents.length.toString(), icon: Layers },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-surface-secondary/30 border border-white/5 p-4 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-muted uppercase text-[9px] tracking-widest font-bold">
                                <stat.icon className="w-3 h-3" />
                                {stat.label}
                            </div>
                            <p className="text-xl font-display font-medium">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs Layout */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex border-b border-white/5 px-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-6 py-4 text-[10px] uppercase font-bold tracking-[0.2em] transition-all relative",
                                activeTab === tab.id ? "text-accent-teal" : "text-muted hover:text-foreground"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <tab.icon className="w-3 h-3" />
                                {tab.label}
                            </span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-teal shadow-[0_0_10px_rgba(0,255,209,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-black/10">
                    {activeTab === "overview" && (
                        <div className="space-y-8">
                            {subAgents.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-[10px] uppercase tracking-widest text-[#444]">Sub-Agents Active</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {subAgents.map(child => (
                                            <div key={child.id} className="glass p-4 rounded-xl flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center border border-white/5">
                                                    <Cpu className="w-5 h-5 text-accent-purple/50" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{child.name}</p>
                                                    <p className="text-[10px] text-muted truncate">{child.role}</p>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h4 className="text-[10px] uppercase tracking-widest text-[#444]">Recent Neural Activity</h4>
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex gap-4 p-3 border-l border-white/10 hover:bg-white/[0.02] transition-colors group">
                                            <div className="mt-1 w-1 h-1 rounded-full bg-accent-teal group-hover:scale-150 transition-transform" />
                                            <div className="flex-1">
                                                <p className="text-xs">Executed task: <span className="text-accent-purple">Optimize Data Stream v3</span></p>
                                                <p className="text-[10px] text-muted font-mono mt-1">14:22:10 · Success · 0.4s Latency</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "skills" && (
                        <div className="grid grid-cols-3 gap-6">
                            {(agent.skills || []).map(skill => (
                                <div key={skill.id} className="glass p-6 rounded-2xl border-white/5 relative group">
                                    <div className="absolute top-4 right-4 text-[8px] bg-accent-teal/10 text-accent-teal border border-accent-teal/20 px-1 rounded uppercase font-bold tracking-tighter">Enabled</div>
                                    <div className="w-12 h-12 bg-surface rounded-xl border border-white/5 flex items-center justify-center mb-4 transition-transform group-hover:rotate-6">
                                        <Zap className="text-accent-orange w-6 h-6" />
                                    </div>
                                    <h5 className="font-display text-base tracking-tight mb-1">{skill.skillName}</h5>
                                    <p className="text-[10px] text-muted leading-relaxed">System-level integration for automated data processing and neural feedback.</p>
                                </div>
                            ))}

                            <button className="border-2 border-dashed border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-muted hover:border-accent-teal/30 hover:text-accent-teal transition-all group">
                                <div className="w-10 h-10 rounded-full border border-dashed border-muted/50 flex items-center justify-center group-hover:rotate-90 transition-transform">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-widest">Install from ClawHub</span>
                            </button>
                        </div>
                    )}

                    {activeTab === "memory" && (
                        <div className="h-full flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-accent-teal" />
                                    <span className="text-[10px] uppercase tracking-widest font-bold">CLAUDE.md</span>
                                </div>
                                <button className="text-[10px] uppercase tracking-widest font-bold text-accent-purple hover:underline">Commit Changes</button>
                            </div>
                            <textarea
                                className="flex-1 bg-surface/50 border border-white/5 rounded-xl p-6 font-mono text-sm focus:outline-none focus:border-accent-teal/50 transition-all resize-none text-foreground/80 leading-relaxed"
                                defaultValue={agent.persona || "# Neural Persona\nAuto-generated from system template.\n\n## Objectives\n- Maintain stream integrity\n- Optimize query times"}
                            />
                        </div>
                    )}

                    {activeTab === "logs" && (
                        <div className="h-full bg-black/20 border border-white/5 rounded-xl p-4 font-mono text-[11px] overflow-y-auto space-y-1">
                            <p className="text-muted italic opacity-30">// Initializing remote log stream...</p>
                            <p className="text-accent-teal">[SUCCESS] Connection established to APEX-OS Node 4000</p>
                            <p className="text-accent-purple">[@kernel] Model {agent.model} loaded into hyper-buffer</p>
                            <p className="text-foreground/70 tracking-tight leading-relaxed">2024-03-03 14:20:00 [INFO] Starting internal health monitor...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
