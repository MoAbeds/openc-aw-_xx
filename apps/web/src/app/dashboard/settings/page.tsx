"use client";

import { useEffect, useState } from "react";
import {
    Shield,
    Users,
    CreditCard,
    UserPlus,
    Mail,
    Crown,
    CheckCircle2,
    Clock,
    ArrowUpRight
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { WorkspaceDTO } from "@apex-os/types";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
}

export default function SettingsPage() {
    const { workspaceId, workspaces } = useAuthStore();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const currentWorkspace = workspaces.find(w => w.id === workspaceId);
    const planLimits = {
        free: 2,
        pro: 10,
        enterprise: Infinity
    };
    const agentLimit = planLimits[(currentWorkspace?.plan as "free" | "pro" | "enterprise") || "free"] || 2;

    useEffect(() => {
        const loadMembers = async () => {
            try {
                const res = await api.get<any>("/api/workspaces/members");
                if (res.data) {
                    setMembers(res.data);
                }
            } catch (err) {
                console.error("Failed to load members", err);
            } finally {
                setLoading(false);
            }
        };
        if (workspaceId) loadMembers();
    }, [workspaceId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteStatus(null);
        try {
            await api.post("/api/workspaces/members/invite", { email: inviteEmail, role: inviteRole });
            setInviteStatus({ type: 'success', message: `Invitation sent to ${inviteEmail}` });
            setInviteEmail("");
        } catch (err: any) {
            setInviteStatus({ type: 'error', message: err.response?.data?.error || "Failed to send invitation" });
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-display italic tracking-tight text-foreground">Workspace Nexus</h2>
                <p className="text-muted text-sm tracking-[0.2em] uppercase">Configure your operational environment and neural network nodes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Plan & Usage */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="glass p-8 rounded-3xl border-white/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center border border-accent-teal/20">
                                <Shield className="w-5 h-5 text-accent-teal" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm uppercase tracking-widest text-muted">Subscription Plan</h3>
                                <p className="text-xl font-display lowercase text-accent-teal italic">{currentWorkspace?.plan || "Free"} Protocol</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted">Agent Utilization</span>
                                <span className="text-foreground font-bold">... / {agentLimit === Infinity ? "∞" : agentLimit} Nodes</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent-teal transition-all duration-1000"
                                    style={{ width: '40%' }} // Mock usage
                                />
                            </div>
                        </div>

                        <button className="w-full py-3 rounded-xl bg-accent-teal/10 border border-accent-teal/20 text-accent-teal font-bold text-xs uppercase tracking-widest hover:bg-accent-teal/20 transition-all flex items-center justify-center gap-2">
                            Upgrade Neural Tier
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="glass p-8 rounded-3xl border-white/5 space-y-4">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted">Protocol Features</h4>
                        <div className="space-y-3">
                            {[
                                "Unlimited Message History",
                                "Advanced Neural Personas",
                                "Custom Skill Injection",
                                "Fleet Status Sync"
                            ].map(feat => (
                                <div key={feat} className="flex items-center gap-3 text-xs text-foreground/70">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal/50" />
                                    {feat}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Members & Invites */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="glass p-8 rounded-3xl border-white/5 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center border border-accent-purple/20">
                                    <Users className="w-5 h-5 text-accent-purple" />
                                </div>
                                <h3 className="font-display text-xl lowercase italic">Active Operatives</h3>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-[10px] font-bold text-accent-purple uppercase tracking-widest">
                                {members.length} Members
                            </div>
                        </div>

                        <div className="space-y-0 divide-y divide-white/5">
                            {members.length > 0 ? members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-surface-secondary border border-white/5 flex items-center justify-center overflow-hidden">
                                            <div className="w-full h-full bg-gradient-to-br from-accent-purple/20 to-transparent flex items-center justify-center font-bold text-accent-purple/50">
                                                {member.name[0]}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground transition-colors group-hover:text-accent-purple">{member.name}</p>
                                            <p className="text-xs text-muted truncate">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className={cn(
                                            "text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-lg border",
                                            member.role === 'owner' ? "text-accent-orange border-accent-orange/20 bg-accent-orange/5" : "text-muted border-white/5 bg-white/5"
                                        )}>
                                            {member.role}
                                        </span>
                                        <p className="text-[10px] text-muted font-mono hidden md:block">Joined: {new Date(member.joinedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-12 text-center text-muted italic text-sm">No other operatives detected.</div>
                            )}
                        </div>
                    </div>

                    <div className="glass p-8 rounded-3xl border-white/5 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent-teal/10 flex items-center justify-center border border-accent-teal/20">
                                <UserPlus className="w-5 h-5 text-accent-teal" />
                            </div>
                            <h3 className="font-display text-xl lowercase italic">Authorize Access</h3>
                        </div>

                        <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2 relative">
                                <input
                                    type="email"
                                    placeholder="operative@apex-os.com"
                                    className="w-full bg-surface-secondary/50 border border-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-accent-teal transition-all text-sm font-mono placeholder:text-muted/30"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    required
                                />
                                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                            </div>
                            <select
                                className="bg-[#0D0D0F] border border-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-accent-teal transition-all text-sm font-mono text-muted uppercase tracking-widest text-[10px]"
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value)}
                            >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                                <option value="viewer">Viewer</option>
                            </select>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-xl bg-accent-teal text-background font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,209,0.2)]"
                            >
                                Dispatch Invite
                            </button>
                        </form>

                        {inviteStatus && (
                            <div className={cn(
                                "p-4 rounded-xl border flex items-center gap-3 text-xs font-bold transition-all animate-in slide-in-from-top-2",
                                inviteStatus.type === 'success' ? "bg-accent-teal/10 border-accent-teal/20 text-accent-teal" : "bg-destructive/10 border-destructive/20 text-destructive"
                            )}>
                                {inviteStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                {inviteStatus.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
