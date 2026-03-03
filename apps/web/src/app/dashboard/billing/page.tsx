"use client";

import { useEffect, useState } from "react";
import {
    CreditCard,
    Check,
    Zap,
    ShieldCheck,
    Rocket,
    ArrowRight,
    Loader2,
    ShieldAlert,
    BarChart3
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/store/useAgentStore";

interface Plan {
    id: string;
    name: string;
    agents: number;
    price: number;
    priceId: string | null;
}

const PRICING_PLANS = [
    {
        id: "free",
        name: "Base Fleet",
        price: 0,
        agents: 2,
        features: ["2 Active Agents", "Standard Logs", "Community Skills"],
        highlight: false,
        icon: Zap
    },
    {
        id: "pro",
        name: "Pro Operator",
        price: 97,
        agents: 10,
        features: ["10 Active Agents", "Priority Task Queue", "Custom Skill Creation", "Advanced Analytics"],
        highlight: true,
        icon: Rocket
    },
    {
        id: "enterprise",
        name: "Elite Agency",
        price: 297,
        agents: 999,
        features: ["Unlimited Agents", "Dedicated Instance", "White-Label Portals", "24/7 Neural Support"],
        highlight: false,
        icon: ShieldCheck
    }
];

export default function BillingPage() {
    const [currentPlan, setCurrentPlan] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
    const agents = useAgentStore(state => state.agents);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get<any>("/api/billing/status");
            setCurrentPlan(res.data);
        } catch (err) {
            console.error("Failed to load billing status");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpgrade = async (planId: string) => {
        if (planId === "free") return;
        setIsRedirecting(planId);
        try {
            const res = await api.post<any>("/api/billing/checkout", { planId });
            window.location.href = res.url;
        } catch (err) {
            alert("Checkout protocol failed initialization.");
        } finally {
            setIsRedirecting(null);
        }
    };

    const handlePortal = async () => {
        setIsRedirecting("portal");
        try {
            const res = await api.get<any>("/api/billing/portal");
            window.location.href = res.url;
        } catch (err) {
            alert("Billing portal access denied.");
        } finally {
            setIsRedirecting(null);
        }
    };

    if (isLoading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent-teal" />
        </div>
    );

    const usagePercent = (agents.length / (currentPlan?.plan?.agents || 1)) * 100;

    return (
        <div className="max-w-7xl mx-auto py-10 px-6 space-y-12">
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-accent-purple">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Subscription Management</span>
                </div>
                <h1 className="text-4xl font-display italic tracking-tight text-foreground underline decoration-accent-purple/30 underline-offset-8">Billing & Scaling</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Plan Overview */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface rounded-3xl border border-white/5 p-8 space-y-8 h-full">
                        <div className="space-y-1">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Active Plan</h2>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                {currentPlan?.plan?.name?.toUpperCase() || "FREE"}
                                <span className="text-[10px] py-1 px-2 bg-accent-teal/10 text-accent-teal rounded border border-accent-teal/20">ACTIVE</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold uppercase text-muted">Agent Utilization</span>
                                <span className="text-xs font-mono">{agents.length} / {currentPlan?.plan?.agents === 999 ? '∞' : currentPlan?.plan?.agents}</span>
                            </div>
                            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-gradient-to-r from-accent-teal to-accent-purple transition-all duration-1000"
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                            </div>
                            {usagePercent >= 90 && (
                                <div className="flex items-center gap-2 text-accent-orange text-[10px] font-bold uppercase animate-pulse">
                                    <ShieldAlert className="w-3 h-3" /> Near Capacity
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-4">
                            <button
                                onClick={handlePortal}
                                disabled={!!isRedirecting || !currentPlan?.workspace?.stripeCustomerId}
                                className="w-full py-4 bg-surface-secondary border border-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                            >
                                {isRedirecting === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                                Manage via Stripe
                            </button>
                            <p className="text-[9px] text-muted-foreground text-center uppercase tracking-tighter">Safe & Encrypted Transactions</p>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {PRICING_PLANS.filter(p => p.id !== 'free').map(plan => (
                        <div
                            key={plan.id}
                            className={cn(
                                "relative bg-surface rounded-[2.5rem] border p-10 space-y-8 flex flex-col transition-all group",
                                plan.highlight ? "border-accent-purple shadow-[0_0_40px_rgba(167,139,250,0.15)]" : "border-white/5 hover:border-white/20"
                            )}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-purple text-white text-[9px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full shadow-lg">
                                    Most Operative
                                </div>
                            )}

                            <div className="flex justify-between items-start">
                                <div className="space-y-4">
                                    <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center">
                                        <plan.icon className={cn("w-7 h-7", plan.highlight ? "text-accent-purple" : "text-muted")} />
                                    </div>
                                    <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold italic">${plan.price}</div>
                                    <div className="text-[9px] text-muted uppercase font-bold tracking-widest">per month</div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                {plan.features.map(f => (
                                    <div key={f} className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="w-4 h-4 rounded-full bg-accent-teal/10 flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-accent-teal" />
                                        </div>
                                        {f}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={!!isRedirecting || currentPlan?.workspace?.plan === plan.id}
                                className={cn(
                                    "w-full py-5 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-2",
                                    currentPlan?.workspace?.plan === plan.id
                                        ? "bg-accent-teal/10 text-accent-teal border border-accent-teal/20"
                                        : plan.highlight
                                            ? "bg-accent-purple text-white shadow-[0_0_20px_rgba(167,139,250,0.3)] hover:scale-[1.03]"
                                            : "bg-surface-secondary border border-white/5 hover:bg-white/5"
                                )}
                            >
                                {isRedirecting === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    currentPlan?.workspace?.plan === plan.id ? "Current Plan" : <>Elevate Fleet <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
