"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    Cpu,
    Zap,
    Shield,
    MessageSquare,
    Monitor,
    Check,
    Rocket,
    Plus,
    Info,
    Layers,
    Clock,
    Terminal,
    AlertCircle,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepProgressBar } from "@/components/StepProgressBar";
import { useAgentStore } from "@/store/useAgentStore";
import { api } from "@/lib/api";

const STEPS = ["Identity", "Intelligence", "Skills", "Protocol", "Deploy"];

const CHANNEL_OPTIONS = [
    { id: "telegram", label: "Telegram", icon: MessageSquare, color: "text-[#0088cc]" },
    { id: "discord", label: "Discord", icon: Shield, color: "text-[#5865F2]" },
    { id: "slack", label: "Slack", icon: MessageSquare, color: "text-[#E01E5A]" },
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-[#25D366]" },
];

const MODELS = [
    { id: "haiku-4-5", label: "Haiku 4.5", cost: "0.25", description: "Fast, efficient for routine tasks." },
    { id: "sonnet-4-6", label: "Sonnet 4.6", cost: "0.75", description: "Balanced intelligence and speed." },
    { id: "opus-4-6", label: "Opus 4.6", cost: "2.50", description: "Maximum reasoning and complexity." },
];

const TONE_PRESETS = [
    { id: "professional", label: "Professional", template: "Maintain a formal, corporate tone. Use industry standard terminology. Be precise and polite." },
    { id: "casual", label: "Casual", template: "Be friendly and approachable. Use contractions. Keep the conversation light but helpful." },
    { id: "terse", label: "Terse", template: "Be as concise as possible. Provide direct answers without pleasantries. Focus on data density." },
    { id: "verbose", label: "Verbose", template: "Provide detailed explanations. Use analogies. Explore edge cases and provide context for all answers." },
];

const PRESET_COLORS = ["#00FFD1", "#FF6B35", "#A78BFA", "#3B82F6", "#EF4444", "#10B981"];

export default function AgentBuilderPage() {
    const router = useRouter();
    const { agents, fetchAgents } = useAgentStore();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deploying, setDeploying] = useState(false);
    const [deployStatus, setDeployStatus] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        role: "",
        color: "#00FFD1",
        channel: "telegram",
        parentId: null as string | null,
        model: "haiku-4-5",
        persona: "",
        skills: [] as string[],
        channelConfig: {} as Record<string, string>,
    });

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const nextStep = () => setStep(s => Math.min(s + 1, 5));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleDeploy = async () => {
        setDeploying(true);
        setError(null);
        setDeployStatus(["Pulling base image apex-os/agent-runner..."]);

        try {
            // 1. Create Agent in DB
            await new Promise(r => setTimeout(r, 1500));
            setDeployStatus(prev => [...prev, "Writing neural persona to CLAUDE.md..."]);

            const newAgent = await api.post<any>("/api/agents", {
                name: formData.name,
                role: formData.role,
                model: formData.model,
                persona: formData.persona,
                parentId: formData.parentId,
                channel: formData.channel,
                color: formData.color,
            });

            // 2. Provision Container
            await new Promise(r => setTimeout(r, 2000));
            setDeployStatus(prev => [...prev, "Spawning isolated Docker container..."]);

            await api.post(`/api/agents/${newAgent.id}/start`);

            // 3. Health Check Wait
            setDeployStatus(prev => [...prev, "Verifying OpenClaw heartbeat..."]);
            await new Promise(r => setTimeout(r, 2500));

            setDeployStatus(prev => [...prev, "SUCCESS: Neural link established."]);

            setTimeout(() => {
                router.push(`/dashboard`);
            }, 1500);

        } catch (err: any) {
            setError(err.message || "Critical failure during deployment sequence.");
            setDeploying(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 font-mono">
            <div className="mb-12">
                <h2 className="text-3xl font-display italic tracking-tight mb-2">Architect Gateway</h2>
                <p className="text-muted text-xs tracking-[0.3em] uppercase">Instantiate new neural assets into the fleet hierarchy.</p>
            </div>

            <StepProgressBar currentStep={step} totalSteps={5} steps={STEPS} />

            <div className="relative min-h-[500px]">
                <AnimatePresence mode="wait">

                    {/* STEP 1: IDENTITY */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass p-8 rounded-2xl border-white/5 space-y-8"
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-1 h-8 bg-accent-teal" />
                                <h3 className="text-xl font-display lowercase tracking-tight">Stage 01: Core Identity</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Codename</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Sentinel Prime"
                                            className="form-input-apex"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Specialization</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Market Intelligence"
                                            className="form-input-apex"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Neural Color</label>
                                        <div className="flex gap-3 pt-2">
                                            {PRESET_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setFormData({ ...formData, color })}
                                                    className={cn(
                                                        "w-8 h-8 rounded-lg border-2 transition-all",
                                                        formData.color === color ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Comm Protocol</label>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            {CHANNEL_OPTIONS.map(c => {
                                                const Icon = c.icon;
                                                const active = formData.channel === c.id;
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => setFormData({ ...formData, channel: c.id })}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl border transition-all text-xs",
                                                            active ? "bg-white/5 border-accent-teal/50 text-foreground" : "bg-transparent border-white/5 text-muted hover:border-white/10"
                                                        )}
                                                    >
                                                        <Icon className={cn("w-4 h-4", active ? c.color : "")} />
                                                        {c.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Parent Nexus (Optional)</label>
                                        <select
                                            className="form-input-apex"
                                            value={formData.parentId || ""}
                                            onChange={e => setFormData({ ...formData, parentId: e.target.value || null })}
                                        >
                                            <option value="">Independent Node</option>
                                            {agents.map(a => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: INTELLIGENCE */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass p-8 rounded-2xl border-white/5 space-y-8"
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-1 h-8 bg-accent-orange" />
                                <h3 className="text-xl font-display lowercase tracking-tight">Stage 02: Neural Configuration</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Model Architecture</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {MODELS.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setFormData({ ...formData, model: m.id })}
                                                className={cn(
                                                    "p-4 rounded-xl border text-left transition-all space-y-2",
                                                    formData.model === m.id ? "bg-accent-orange/5 border-accent-orange/50" : "bg-transparent border-white/5 hover:border-white/10"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold tracking-tight">{m.label}</span>
                                                    <span className="text-[9px] font-mono text-accent-orange">${m.cost}/1k ops</span>
                                                </div>
                                                <p className="text-[10px] text-muted leading-tight">{m.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Neural Persona (CLAUDE.md)</label>
                                        <div className="flex gap-2">
                                            {TONE_PRESETS.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setFormData({ ...formData, persona: t.template })}
                                                    className="px-2 py-0.5 rounded-full border border-white/5 text-[8px] uppercase font-bold text-muted hover:text-accent-orange hover:border-accent-orange/30 transition-all"
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        placeholder="# Target Objectives..."
                                        className="form-input-apex h-48 py-4 px-4 font-mono text-sm leading-relaxed"
                                        value={formData.persona}
                                        onChange={e => setFormData({ ...formData, persona: e.target.value })}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: SKILLS */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass p-8 rounded-2xl border-white/5 space-y-8"
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-1 h-8 bg-accent-purple" />
                                <h3 className="text-xl font-display lowercase tracking-tight">Stage 03: Capability Matrix</h3>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pb-4">
                                {["Data Analysis", "Internet Search", "Code Execution", "Memory Management", "Image Generation", "Email Integration"].map(skill => {
                                    const active = formData.skills.includes(skill);
                                    return (
                                        <button
                                            key={skill}
                                            onClick={() => {
                                                const newSkills = active ? formData.skills.filter(s => s !== skill) : [...formData.skills, skill];
                                                setFormData({ ...formData, skills: newSkills });
                                            }}
                                            className={cn(
                                                "p-4 rounded-xl border text-center transition-all group relative overflow-hidden",
                                                active ? "bg-accent-purple/5 border-accent-purple/50 text-accent-purple" : "bg-transparent border-white/5 text-muted hover:border-white/10"
                                            )}
                                        >
                                            <Zap className={cn("w-5 h-5 mx-auto mb-2 transition-transform", active ? "scale-110" : "opacity-30 group-hover:opacity-100")} />
                                            <span className="text-[10px] uppercase font-bold tracking-widest">{skill}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 text-muted hover:border-accent-purple/30 group transition-all">
                                <div className="w-12 h-12 rounded-full border border-dashed border-muted/50 flex items-center justify-center group-hover:rotate-90 transition-transform">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] uppercase tracking-widest font-bold">Inject Custom Skill Bundle (.js)</p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: PROTOCOL CONFIG */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass p-8 rounded-2xl border-white/5 space-y-8"
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-1 h-8 bg-white/20" />
                                <h3 className="text-xl font-display lowercase tracking-tight">Stage 04: {formData.channel} Connectivity</h3>
                            </div>

                            <div className="space-y-6 max-w-lg mx-auto py-8">
                                {formData.channel === 'telegram' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Bot API Token</label>
                                        <input
                                            type="password"
                                            placeholder="e.g. 123456789:ABCDEF..."
                                            className="form-input-apex"
                                            value={formData.channelConfig.token || ""}
                                            onChange={e => setFormData({ ...formData, channelConfig: { ...formData.channelConfig, token: e.target.value } })}
                                        />
                                    </div>
                                )}
                                {formData.channel === 'discord' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Bot Token</label>
                                            <input
                                                type="password"
                                                placeholder="MTIzNDU2..."
                                                className="form-input-apex"
                                                value={formData.channelConfig.token || ""}
                                                onChange={e => setFormData({ ...formData, channelConfig: { ...formData.channelConfig, token: e.target.value } })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Target Guild ID</label>
                                            <input
                                                type="text"
                                                placeholder="123456789..."
                                                className="form-input-apex"
                                                value={formData.channelConfig.guildId || ""}
                                                onChange={e => setFormData({ ...formData, channelConfig: { ...formData.channelConfig, guildId: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="bg-surface p-4 border border-white/5 rounded-xl flex gap-3 italic">
                                    <Info className="w-4 h-4 text-accent-teal shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-muted leading-relaxed">Ensure the bot is properly added to your target platform and has necessary permissions to receive and respond to neural signals.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 5: DEPLOY */}
                    {step === 5 && (
                        <motion.div
                            key="step5"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass p-8 rounded-2xl border-white/5 space-y-8"
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-1 h-8 bg-accent-teal shadow-[0_0_10px_#00FFD1]" />
                                <h3 className="text-xl font-display lowercase tracking-tight">Stage 05: Final Review & Ignition</h3>
                            </div>

                            {!deploying ? (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-surface p-6 rounded-2xl border border-white/5 space-y-4">
                                            <h4 className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#444]">Neural Profile</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted">Codename</span>
                                                    <span className="font-bold">{formData.name || "N/A"}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted">Intelligence</span>
                                                    <span className="text-accent-orange uppercase">{formData.model}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted">Protocol</span>
                                                    <span className="text-accent-teal uppercase">{formData.channel}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted">Hierarchy</span>
                                                    <span className="text-accent-purple uppercase">{formData.parentId ? 'Sub-agent' : 'Autonomous'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-surface p-6 rounded-2xl border border-white/5 space-y-4">
                                            <h4 className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#444]">Capability Summary</h4>
                                            <div className="flex flex-wrap gap-2 text-[10px]">
                                                {formData.skills.length > 0 ? formData.skills.map(s => (
                                                    <div key={s} className="px-2 py-1 bg-white/5 rounded text-foreground/80">{s}</div>
                                                )) : <span className="text-muted italic">No external skills assigned</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Deployment JSON Summary</label>
                                        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 font-mono text-[10px] text-accent-teal/60">
                                            <pre>{JSON.stringify({ ...formData, version: "1.2.0-stable", status: "provisioning" }, null, 2)}</pre>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center space-y-8">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-2 border-white/5 flex items-center justify-center">
                                            <Rocket className="w-10 h-10 text-accent-teal animate-bounce" />
                                        </div>
                                        <div className="absolute inset-0 border-2 border-accent-teal border-t-transparent rounded-full animate-spin" />
                                    </div>

                                    <div className="space-y-3 w-full max-w-xs">
                                        {deployStatus.map((status, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest"
                                            >
                                                {i === deployStatus.length - 1 && !status.includes('SUCCESS') ? (
                                                    <Loader2 className="w-3 h-3 animate-spin text-accent-teal" />
                                                ) : (
                                                    <Check className="w-3 h-3 text-accent-teal" />
                                                )}
                                                <span className={cn(status.includes('SUCCESS') ? "text-accent-teal" : "text-muted")}>
                                                    {status}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            <div className="mt-12 flex justify-between">
                <button
                    onClick={prevStep}
                    disabled={step === 1 || deploying}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/5 text-muted hover:text-foreground hover:bg-white/5 transition-all text-sm font-bold disabled:opacity-0 disabled:pointer-events-none"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Previous Step
                </button>

                {step < 5 ? (
                    <button
                        onClick={nextStep}
                        className="flex items-center gap-2 px-8 py-3 rounded-lg bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-all text-sm font-bold shadow-lg"
                    >
                        Advance Configuration
                        <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleDeploy}
                        disabled={deploying}
                        className="flex items-center gap-3 px-10 py-4 rounded-lg bg-accent-teal text-background font-display uppercase font-bold tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,255,209,0.3)] disabled:opacity-20 disabled:pointer-events-none"
                    >
                        Ignite Agent
                        <Rocket className="w-4 h-4" />
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-8 bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center gap-4 text-destructive text-sm font-bold animate-in fade-in slide-in-from-bottom-4">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <style jsx global>{`
        .form-input-apex {
          @apply w-full bg-surface-secondary/50 border border-white/5 px-4 py-3 rounded-xl focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/10 transition-all text-sm font-mono placeholder:text-muted/30;
        }
      `}</style>
        </div>
    );
}
