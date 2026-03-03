"use client";

import { useEffect, useState, useMemo } from "react";
import {
    Cpu,
    Zap,
    MessageSquare,
    Clock,
    ShieldCheck,
    Activity,
    Send,
    LogOut,
    ExternalLink,
    Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface PortalConfig {
    companyName: string;
    logoUrl?: string;
    primaryColor: string;
    name: string;
}

interface PortalAgent {
    id: string;
    name: string;
    role: string;
    status: string;
    avatar?: string;
    color?: string;
    updatedAt: string;
}

export default function PortalDashboard() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const clientId = params.clientId as string;

    const [config, setConfig] = useState<PortalConfig | null>(null);
    const [agents, setAgents] = useState<PortalAgent[]>([]);
    const [usage, setUsage] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<PortalAgent | null>(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Initial Config & Token Load
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get<any>(`/api/portal/config/${clientId}`);
                setConfig(res.data); // Actually, portal.ts returns { data: workspace }
            } catch (err) {
                setError("Portal configuration not found.");
            }
        };

        const existingToken = searchParams.get("token") || localStorage.getItem(`portal_token_${clientId}`);
        if (existingToken) {
            setToken(existingToken);
            localStorage.setItem(`portal_token_${clientId}`, existingToken);
        }

        fetchConfig();
    }, [clientId, searchParams]);

    // Data Load (once token available)
    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [agentsRes, usageRes] = await Promise.all([
                    api.get<any>("/api/portal/agents", { headers: { Authorization: `Bearer ${token}` } }),
                    api.get<any>("/api/portal/usage", { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setAgents(agentsRes.data);
                setUsage(usageRes.data);
                if (agentsRes.data.length > 0) setSelectedAgent(agentsRes.data[0]);
            } catch (err) {
                setError("Session expired or invalid portal token.");
                setToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAgent || !message.trim() || !token) return;

        setIsSending(true);
        try {
            await api.post("/api/portal/message", {
                agentId: selectedAgent.id,
                message: message.trim()
            }, { headers: { Authorization: `Bearer ${token}` } });
            setMessage("");
            // In a real app, maybe append to a local chat history
        } catch (err) {
            alert("Failed to deliver message to agent protocol.");
        } finally {
            setIsSending(false);
        }
    };

    const primaryColor = config?.primaryColor || "#00FFD1";

    if (error && !config) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-foreground font-mono px-6">
                <div className="text-center space-y-4">
                    <ShieldCheck className="w-12 h-12 text-destructive mx-auto mb-6 opacity-50" />
                    <h1 className="text-xl font-bold tracking-tighter uppercase underline decoration-destructive underline-offset-8 decoration-2">{error}</h1>
                    <p className="text-muted text-sm max-w-sm mx-auto">Please contact your workspace administrator for a valid access link.</p>
                </div>
            </div>
        );
    }

    if (!token && !isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-black px-6">
                <div
                    className="w-full max-w-md p-10 rounded-[2rem] border border-white/5 bg-surface-secondary relative overflow-hidden space-y-8 animate-in fade-in zoom-in-95 duration-500"
                    style={{ borderColor: `${primaryColor}20` }}
                >
                    {/* Decorative glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full" style={{ backgroundColor: `${primaryColor}20` }} />

                    <div className="text-center space-y-4 relative z-10">
                        {config?.logoUrl ? (
                            <img src={config.logoUrl} alt="Logo" className="h-12 mx-auto mb-4" />
                        ) : (
                            <div className="h-16 w-16 mx-auto rounded-3xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                                <Cpu className="w-8 h-8" style={{ color: primaryColor }} />
                            </div>
                        )}
                        <h1 className="text-2xl font-display italic tracking-tight uppercase">{config?.companyName || config?.name || "Client Portal"}</h1>
                        <p className="text-muted text-xs uppercase tracking-[0.2em] font-bold">Secure Access Gateway</p>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="password"
                            placeholder="ENTER ACCESS TOKEN"
                            className="w-full bg-black/40 border border-white/5 p-4 rounded-2xl text-center font-mono text-sm tracking-widest focus:outline-none transition-all placeholder:opacity-30 focus:border-opacity-100"
                            style={{ borderColor: `${primaryColor}40` }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    setToken(val);
                                    localStorage.setItem(`portal_token_${clientId}`, val);
                                }
                            }}
                        />
                        <p className="text-[10px] text-center text-muted/50 uppercase font-bold tracking-widest">Authorized use only. Session will be logged.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent-teal/30">
            {/* Header */}
            <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
                <div className="flex items-center gap-6">
                    {config?.logoUrl ? (
                        <img src={config.logoUrl} alt="Logo" className="h-8" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5" style={{ color: primaryColor }} />
                            <span className="font-display italic text-lg tracking-tight uppercase">{config?.companyName}</span>
                        </div>
                    )}
                    <div className="h-4 w-px bg-white/10 hidden md:block" />
                    <nav className="hidden md:flex gap-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground cursor-pointer">Intelligence</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground transition-colors cursor-pointer">Fleet Analytics</span>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-3 py-1 rounded bg-white/5 border border-white/10 hidden sm:block">
                        <span className="text-[9px] font-bold tracking-widest text-muted uppercase">Usage: {usage?.tasksThisMonth || 0} Tasks</span>
                    </div>
                    <button
                        onClick={() => {
                            setToken(null);
                            localStorage.removeItem(`portal_token_${clientId}`);
                        }}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <LogOut className="w-4 h-4 text-muted group-hover:text-destructive transition-colors" />
                    </button>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 max-w-[1400px] mx-auto w-full">
                {/* Agent Selector */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted px-2">Assigned Operatives</h2>
                        <div className="space-y-2">
                            {agents.map(agent => (
                                <button
                                    key={agent.id}
                                    onClick={() => setSelectedAgent(agent)}
                                    className={cn(
                                        "w-full p-4 rounded-2xl border text-left transition-all group relative overflow-hidden",
                                        selectedAgent?.id === agent.id
                                            ? "bg-white/5 border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                            : "bg-surface border-transparent hover:border-white/5"
                                    )}
                                >
                                    {selectedAgent?.id === agent.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: primaryColor }} />
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                                            <Zap className="w-5 h-5" style={{ color: agent.color || primaryColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate tracking-tight">{agent.name}</p>
                                            <p className="text-[10px] text-muted truncate uppercase tracking-widest">{agent.role}</p>
                                        </div>
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            agent.status === 'active' ? 'bg-accent-teal shadow-[0_0_8px_rgba(0,255,209,0.5)]' : 'bg-muted'
                                        )} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dashboard & Chat */}
                <div className="lg:col-span-9 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                    {selectedAgent ? (
                        <>
                            {/* Stats Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
                                    <div className="flex items-center gap-2 text-muted">
                                        <Activity className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Live Status</span>
                                    </div>
                                    <div className="text-2xl font-display italic uppercase" style={{ color: primaryColor }}>{selectedAgent.status}</div>
                                </div>
                                <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
                                    <div className="flex items-center gap-2 text-muted">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Sync</span>
                                    </div>
                                    <div className="text-2xl font-display italic uppercase">Uptime 99.9%</div>
                                </div>
                                <div className="glass p-6 rounded-3xl border-white/5 space-y-2">
                                    <div className="flex items-center gap-2 text-muted">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Agent ID</span>
                                    </div>
                                    <div className="text-xs font-mono opacity-50 truncate">{selectedAgent.id}</div>
                                </div>
                            </div>

                            {/* Chat Interface */}
                            <div className="bg-surface rounded-[2.5rem] border border-white/5 flex flex-col h-[500px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                                    <div className="flex items-center gap-4">
                                        <MessageSquare className="w-5 h-5" style={{ color: primaryColor }} />
                                        <div>
                                            <h3 className="text-sm font-bold tracking-tight">Direct Command Line</h3>
                                            <p className="text-[9px] text-muted uppercase tracking-widest font-bold">Secure Encrypted Session • Operator Identified</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 p-8 overflow-y-auto space-y-6 font-mono text-sm leading-relaxed">
                                    <div className="text-muted/40 uppercase text-[9px] text-center tracking-[0.3em] py-4">Session Initialized: {new Date().toLocaleTimeString()}</div>
                                    <div className="flex flex-col gap-2 max-w-[80%] bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10 self-start">
                                        <span className="text-[9px] font-bold mb-1 opacity-50 uppercase tracking-widest">SYSTEM_INIT</span>
                                        Protocol ready. You can now issue direct tasks or queries to the agent.
                                    </div>
                                </div>

                                <form onSubmit={handleSendMessage} className="p-6 bg-black/10 border-t border-white/5 flex gap-4">
                                    <input
                                        type="text"
                                        placeholder="INPUT COMMAND OR TASK..."
                                        className="flex-1 bg-black/40 border border-white/5 px-6 py-4 rounded-2xl text-xs font-mono focus:outline-none focus:border-white/20 transition-all placeholder:opacity-30"
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        disabled={isSending}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !message.trim()}
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-5 h-5 text-background animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5 text-background" />
                                        )}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-30">
                            <Cpu className="w-24 h-24 animate-pulse" />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
