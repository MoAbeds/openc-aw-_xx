"use client";

import { useState } from "react";
import {
    BookOpen,
    Sparkles,
    ArrowRight,
    Cpu,
    FileText,
    Terminal,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ExtractionResult {
    persona: string;
    suggestedSkills: string[];
    extractedFrameworks: string[];
}

export default function CourseToAgentPage() {
    const router = useRouter();
    const [transcript, setTranscript] = useState("");
    const [agentName, setAgentName] = useState("");
    const [focusArea, setFocusArea] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [result, setResult] = useState<ExtractionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExtract = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsExtracting(true);

        try {
            const res = await api.post<any>("/api/agents/from-course", {
                transcriptText: transcript,
                agentName,
                focusArea
            });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to extract methodology");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleCreateAgent = async () => {
        if (!result) return;
        setIsCreating(true);
        setError(null);

        try {
            await api.post("/api/agents", {
                name: agentName || "Course Expert",
                role: `${focusArea} Specialist`,
                persona: result.persona,
                model: "claude-3-5-sonnet-latest"
            });
            router.push("/dashboard");
        } catch (err: any) {
            setError("Failed to finalize agent deployment");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-10 px-6 space-y-12">
            <div className="space-y-2">
                <div className="flex items-center gap-3 text-accent-teal">
                    <BookOpen className="w-5 h-5" />
                    <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Neural Extraction Protocol</span>
                </div>
                <h1 className="text-4xl font-display italic tracking-tight text-foreground">Course-to-Agent Builder</h1>
                <p className="text-muted text-sm max-w-2xl">
                    Transform educational transcripts, workshop videos, or methodology documents into a specialized APEX agent embodying that expert's knowledge.
                </p>
            </div>

            {!result ? (
                <form onSubmit={handleExtract} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Focus Area & Identity</label>
                            <input
                                type="text"
                                placeholder="e.g. High-Ticket Sales, Dental SEO, Real Estate Inbound"
                                className="w-full bg-surface-secondary border border-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-accent-teal transition-all text-sm font-mono"
                                value={focusArea}
                                onChange={e => setFocusArea(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Set Agent Name (e.g. Sales Master v1)"
                                className="w-full bg-surface-secondary border border-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-accent-teal transition-all text-sm font-mono"
                                value={agentName}
                                onChange={e => setAgentName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Intelligence Target</label>
                            <div className="p-4 rounded-xl border border-accent-teal/10 bg-accent-teal/5 flex items-start gap-3">
                                <Sparkles className="w-4 h-4 text-accent-teal mt-0.5" />
                                <p className="text-[11px] text-accent-teal/80 leading-relaxed font-mono">
                                    APEX will use Sonnet 3.5 to parse the transcript, extract key frameworks, and construct a professional CLAUDE.md persona.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted ml-1">Transcript Payload</label>
                        <textarea
                            className="w-full h-80 bg-surface-secondary/50 border border-white/5 rounded-2xl p-6 font-mono text-xs focus:outline-none focus:border-accent-teal/50 transition-all resize-none placeholder:text-muted/30"
                            placeholder="Paste course transcript, webinar text, or book summaries here..."
                            value={transcript}
                            onChange={e => setTranscript(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isExtracting}
                            className="group relative px-10 py-4 bg-accent-teal text-background rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(0,255,209,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            <span className="flex items-center gap-2">
                                {isExtracting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Distilling Methodology...
                                    </>
                                ) : (
                                    <>
                                        Begin Extraction
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                </form>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-accent-teal" />
                                <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted">Generated CLAUDE.md Persona</h3>
                            </div>
                            <span className="text-[9px] text-accent-teal font-mono">Status: Neural Ready</span>
                        </div>
                        <div className="bg-black/90 p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                            {/* Decorative glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-teal/5 blur-3xl rounded-full" />

                            <pre className="text-white/80 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                {result.persona}
                            </pre>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="glass p-6 rounded-2xl border-white/5 space-y-6">
                            <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted">Core Frameworks</h4>
                            <div className="space-y-3">
                                {result.extractedFrameworks.map(fw => (
                                    <div key={fw} className="flex items-center gap-3 text-xs text-foreground/80">
                                        <CheckCircle2 className="w-4 h-4 text-accent-teal/50" />
                                        {fw}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass p-6 rounded-2xl border-white/5 space-y-6">
                            <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted">Recommended Skills</h4>
                            <div className="flex flex-wrap gap-2">
                                {result.suggestedSkills.map(skill => (
                                    <span key={skill} className="px-2.5 py-1 rounded bg-accent-purple/10 border border-accent-purple/20 text-[9px] text-accent-purple font-bold uppercase tracking-tight">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <button
                                onClick={handleCreateAgent}
                                disabled={isCreating}
                                className="w-full py-4 bg-accent-teal text-background rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(0,255,209,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                                Deploy Specialized Agent
                            </button>
                            <button
                                onClick={() => setResult(null)}
                                className="w-full py-4 bg-surface-secondary border border-white/5 rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] text-muted hover:text-foreground transition-all"
                            >
                                Discard & Restart
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
