"use client";

import { useEffect, useState } from "react";
import {
    Zap,
    Play,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Plus,
    LayoutList,
    Workflow,
    ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Workflow {
    id: string;
    name: string;
    steps: any[];
    triggerId?: string;
}

interface WorkflowRun {
    id: string;
    workflowId: string;
    status: "running" | "completed" | "failed";
    currentStepId?: string;
    startedAt: string;
}

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const res = await api.get<any>("/api/workflows");
            setWorkflows(res.data);
        } catch (err) {
            console.error("Failed to load workflows");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTemplate = async () => {
        try {
            const tRes = await api.get<any>("/api/workflows/templates/lead-gen");
            const template = tRes.data;
            await api.post("/api/workflows", template);
            fetchWorkflows();
        } catch (err) {
            alert("Failed to deploy template protocol.");
        }
    };

    const handleRun = async (id: string) => {
        setIsStarting(true);
        try {
            const res = await api.post<any>(`/api/workflows/${id}/run`, {});
            pollRun(res.runId);
        } catch (err) {
            alert("Execution protocol failed.");
        } finally {
            setIsStarting(false);
        }
    };

    const pollRun = async (runId: string) => {
        const fetchStatus = async () => {
            try {
                const res = await api.get<any>(`/api/workflows/runs/${runId}`);
                setActiveRun(res.data || null);
                if (res.data?.status === "running") {
                    setTimeout(fetchStatus, 2000);
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        };
        fetchStatus();
    };

    if (isLoading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent-teal" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto py-10 px-6 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 text-accent-orange">
                        <Workflow className="w-5 h-5" />
                        <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Operational Sequences</span>
                    </div>
                    <h1 className="text-4xl font-display italic tracking-tight text-foreground underline decoration-accent-orange/30 underline-offset-8">Workflow Engine</h1>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleCreateTemplate}
                        className="px-6 py-3 bg-surface border border-white/5 text-accent-orange rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-accent-orange/10 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Lead Gen Prototype
                    </button>
                    <button className="px-6 py-3 bg-accent-orange text-background rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(255,107,53,0.3)] hover:scale-[1.02] transition-all flex items-center gap-2">
                        <LayoutList className="w-4 h-4" />
                        Manual Build
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Workflow List */}
                <div className="lg:col-span-8 space-y-6">
                    {workflows.length === 0 ? (
                        <div className="bg-surface rounded-3xl border border-dashed border-white/5 p-20 text-center space-y-4">
                            <Workflow className="w-12 h-12 text-muted mx-auto opacity-20" />
                            <p className="text-muted text-sm font-mono uppercase tracking-widest">No active sequences detected.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {workflows.map(wf => (
                                <div key={wf.id} className="glass p-8 rounded-[2.5rem] mt-2 border-white/5 group hover:border-accent-orange/20 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold tracking-tight">{wf.name}</h3>
                                            <div className="flex items-center gap-8 font-mono text-[9px] text-muted uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5"><LayoutList className="w-3 h-3" /> {wf.steps.length} Steps</div>
                                                <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Trigger: {wf.triggerId}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRun(wf.id)}
                                            disabled={isStarting || activeRun?.status === "running"}
                                            className="w-14 h-14 bg-accent-orange text-background rounded-2xl flex items-center justify-center hover:scale-[1.1] active:scale-[0.9] transition-all disabled:opacity-30 shadow-lg"
                                        >
                                            <Play className="w-6 h-6 fill-current" />
                                        </button>
                                    </div>

                                    {/* Sequence visualization */}
                                    <div className="mt-8 flex flex-wrap gap-4 relative">
                                        {wf.steps.map((step: any, idx: number) => (
                                            <div key={step.id || idx} className="relative flex flex-col items-center gap-3 min-w-[100px]">
                                                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:border-accent-orange/30 transition-colors">
                                                    <span className="text-[10px] font-bold text-muted">{idx + 1}</span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest">{step.action.replace('_', ' ')}</p>
                                                    <p className="text-[8px] text-muted-foreground uppercase opacity-50 truncate max-w-[80px]">{step.agentId}</p>
                                                </div>
                                                {idx < wf.steps.length - 1 && (
                                                    <ArrowRight className="absolute -right-3 top-3.5 w-3 h-3 text-white/5" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Execution Monitor */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 h-fit sticky top-24 space-y-8 overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent-orange/10 blur-[60px] rounded-full" />

                        <div className="space-y-2 relative z-10">
                            <h2 className="text-sm font-bold uppercase tracking-widest">Live Execution Log</h2>
                            <p className="text-[9px] text-muted uppercase font-bold tracking-widest">Real-time operative telemetry</p>
                        </div>

                        {activeRun ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                                        activeRun.status === "running" ? "bg-accent-orange/10 text-accent-orange" :
                                            activeRun.status === "completed" ? "bg-accent-teal/10 text-accent-teal" : "bg-destructive/10 text-destructive"
                                    )}>
                                        {activeRun.status === "running" ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                            activeRun.status === "completed" ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-tighter">Status: {activeRun.status.toUpperCase()}</p>
                                        <p className="text-[10px] font-mono text-muted">ID: {activeRun.id.slice(0, 8)}...</p>
                                    </div>
                                </div>

                                <div className="space-y-4 border-l border-white/5 pl-6 py-2">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-muted uppercase font-bold tracking-widest">Current Node</p>
                                        <p className="text-xs font-mono">{activeRun.currentStepId || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-muted uppercase font-bold tracking-widest">Runtime</p>
                                        <p className="text-xs font-mono">{new Date(activeRun.startedAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-surface-secondary border border-white/10 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-white/5 transition-colors">
                                    Full Telemetry Report
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 py-10 text-center">
                                <Zap className="w-10 h-10 text-muted mx-auto opacity-10" />
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">No active runs in queue.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
