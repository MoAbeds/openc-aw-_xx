"use client";

import { useEffect, useState } from "react";
import {
    Users,
    Palette,
    Globe,
    ExternalLink,
    Save,
    ShieldCheck,
    Copy,
    CheckCircle2,
    Loader2,
    Activity
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface ClientWorkspace {
    id: string;
    name: string;
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    slug?: string;
    plan: string;
}

export default function ClientsDashboard() {
    const [clients, setClients] = useState<ClientWorkspace[]>([]);
    const [selectedClient, setSelectedClient] = useState<ClientWorkspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [portalToken, setPortalToken] = useState<string | null>(null);

    // Form states
    const [form, setForm] = useState({
        companyName: "",
        slug: "",
        primaryColor: "#00FFD1",
        logoUrl: ""
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const res = await api.get<any>("/api/workspaces");
            setClients(res.data);
            if (res.data.length > 0) selectClient(res.data[0]);
        } catch (err) {
            console.error("Failed to load clients");
        } finally {
            setIsLoading(false);
        }
    };

    const selectClient = (client: ClientWorkspace) => {
        setSelectedClient(client);
        setForm({
            companyName: client.companyName || client.name,
            slug: client.slug || client.id,
            primaryColor: client.primaryColor || "#00FFD1",
            logoUrl: client.logoUrl || ""
        });
        setPortalToken(null);
    };

    const handleSaveBranding = async () => {
        if (!selectedClient) return;
        setIsSaving(true);
        try {
            await api.patch(`/api/workspaces/branding`, form, {
                headers: { 'x-workspace-id': selectedClient.id }
            });
            // Update local state
            setClients((prev: ClientWorkspace[]) => prev.map((c: ClientWorkspace) => c.id === selectedClient.id ? { ...c, ...form } : c));
            alert("Client branding update successful.");
        } catch (err) {
            alert("Failed to update client profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateToken = async () => {
        if (!selectedClient) return;
        try {
            const res = await api.get<any>(`/api/workspaces/portal-token`, {
                headers: { 'x-workspace-id': selectedClient.id }
            });
            setPortalToken(res.data.token);
        } catch (err) {
            alert("Generation protocol failure.");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard");
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent-teal" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 px-6 space-y-12">
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-accent-purple">
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] uppercase font-bold tracking-[0.3em]">White-Label Client Hub</span>
                </div>
                <h1 className="text-4xl font-display italic tracking-tight text-foreground underline decoration-accent-purple/30 underline-offset-8">Operative Portals</h1>
                <p className="text-muted text-sm max-w-2xl font-mono text-accent-purple/60 uppercase tracking-widest text-[9px] font-bold">Manage client environments & secure intelligence access gateways.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Client List */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-[10px] uppercase font-bold tracking-widest text-muted px-2">Managed Workspaces</h3>
                    <div className="space-y-2">
                        {clients.map(client => (
                            <button
                                key={client.id}
                                onClick={() => selectClient(client)}
                                className={cn(
                                    "w-full p-4 rounded-2xl border text-left transition-all",
                                    selectedClient?.id === client.id
                                        ? "bg-accent-purple/10 border-accent-purple/30 text-accent-purple"
                                        : "bg-surface border-transparent hover:border-white/5 text-muted hover:text-foreground"
                                )}
                            >
                                <div className="text-sm font-bold truncate">{client.name}</div>
                                <div className="text-[9px] uppercase font-mono mt-1 opacity-50">{client.plan} PLAN</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Management Panel */}
                <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {selectedClient && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Branding Config */}
                            <div className="bg-surface rounded-3xl border border-white/5 p-8 space-y-6">
                                <div className="flex items-center gap-3 border-b border-white/5 pb-6">
                                    <Palette className="w-5 h-5 text-accent-teal" />
                                    <h2 className="text-sm font-bold uppercase tracking-widest">Portal Branding</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] uppercase font-bold text-muted ml-1 tracking-widest">Company Display Name</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs focus:outline-none focus:border-accent-teal transition-all"
                                            value={form.companyName}
                                            onChange={e => setForm({ ...form, companyName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] uppercase font-bold text-muted ml-1 tracking-widest">Subdomain Slug</label>
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs focus:outline-none focus:border-accent-teal transition-all font-mono"
                                            value={form.slug}
                                            onChange={e => setForm({ ...form, slug: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] uppercase font-bold text-muted ml-1 tracking-widest">Primary Brand Color</label>
                                        <div className="flex gap-4 items-center">
                                            <input
                                                type="color"
                                                className="w-12 h-12 bg-transparent border-none rounded-xl cursor-pointer"
                                                value={form.primaryColor}
                                                onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                                            />
                                            <input
                                                type="text"
                                                className="flex-1 bg-black/40 border border-white/5 p-4 rounded-xl text-xs font-mono uppercase focus:outline-none"
                                                value={form.primaryColor}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveBranding}
                                    disabled={isSaving}
                                    className="w-full py-4 bg-accent-teal text-background rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(0,255,209,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin font-bold" /> : <Save className="w-4 h-4" />}
                                    Synchronize Branding
                                </button>
                            </div>

                            {/* Access Control */}
                            <div className="space-y-8">
                                <div className="bg-surface rounded-3xl border border-white/5 p-8 space-y-6">
                                    <div className="flex items-center gap-3 border-b border-white/5 pb-6">
                                        <ShieldCheck className="w-5 h-5 text-accent-purple" />
                                        <h2 className="text-sm font-bold uppercase tracking-widest">Access Control</h2>
                                    </div>

                                    {!portalToken ? (
                                        <div className="space-y-6">
                                            <p className="text-[10px] text-muted leading-relaxed font-mono uppercase tracking-widest">Generate a secure, encrypted token for this client to access their private agent portal.</p>
                                            <button
                                                onClick={handleGenerateToken}
                                                className="w-full py-4 bg-surface-secondary border border-accent-purple/30 text-accent-purple rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-accent-purple/10 transition-all"
                                            >
                                                Generate Portal Token
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[9px] uppercase font-bold text-muted ml-1 tracking-widest underline decoration-accent-purple decoration-2 underline-offset-4">Portal Access Link</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-black/40 border border-white/5 p-4 rounded-xl text-[10px] font-mono break-all opacity-70">
                                                        {typeof window !== 'undefined' ? window.location.origin : ''}/portal/{form.slug}?token={portalToken}
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(`${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${form.slug}?token=${portalToken}`)}
                                                        className="p-4 bg-surface-secondary border border-white/5 rounded-xl hover:text-accent-teal transition-colors"
                                                    >
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <a
                                                    href={`/portal/${form.slug}?token=${portalToken}`}
                                                    target="_blank"
                                                    className="flex-1 py-4 bg-accent-purple text-white rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(167,139,250,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    View As Client
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Stats */}
                                <div className="glass p-8 rounded-3xl border-white/5 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-5 h-5 text-muted" />
                                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Portal Deployment</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Status</span>
                                            <span className="flex items-center gap-2 text-xs font-bold text-accent-teal uppercase tracking-tighter italic">
                                                Online <Activity className="w-3 h-3 animate-pulse" />
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Subdomain Mock</span>
                                            <span className="text-xs font-mono text-muted/50">{form.slug}.apexos.ai</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
