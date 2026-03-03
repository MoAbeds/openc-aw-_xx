"use client";

import { useFormStatus } from "react-dom";
import { register } from "@/lib/auth";
import { Cpu, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function action(formData: FormData) {
        const password = formData.get("password") as string;
        const confirm = formData.get("confirmPassword") as string;

        if (password !== confirm) {
            setError("Passkey bundles do not match");
            return;
        }

        setError(null);
        const result = await register(formData);
        if (result?.error) {
            setError(result.error);
        } else {
            router.push("/dashboard");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#080809] p-4 relative overflow-hidden font-mono">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-[#080809]"></div>
                <div className="absolute inset-0 animate-pulse-slow"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, #A78BFA 1px, transparent 0)`,
                        backgroundSize: '48px 48px'
                    }}>
                </div>
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-purple/5 blur-[150px] rounded-full animate-drift"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-teal/5 blur-[150px] rounded-full animate-drift-reverse"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="glass p-8 rounded-2xl border border-white/5 shadow-2xl space-y-8 backdrop-blur-xl">
                    <div className="text-center space-y-3">
                        <div className="inline-flex w-16 h-16 bg-accent-purple rounded-2xl items-center justify-center mb-4 shadow-[0_0_30px_rgba(167,139,250,0.3)] animate-float">
                            <ShieldCheck className="text-background w-9 h-9" />
                        </div>
                        <h1 className="text-4xl font-display italic tracking-[0.2em] uppercase font-black text-foreground">APEX OS</h1>
                        <p className="text-[#666] tracking-[0.3em] text-[10px] uppercase font-bold">New Operator Enrollment</p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs py-3 px-4 rounded-lg flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form action={action} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#666] ml-1">Operator Name</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Agent Zero"
                                className="w-full bg-[#0D0D0F] border border-border px-4 py-3 rounded-lg focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20 transition-all text-sm text-foreground placeholder:text-[#333]"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#666] ml-1">Identity UID</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="operator@apex.net"
                                className="w-full bg-[#0D0D0F] border border-border px-4 py-3 rounded-lg focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20 transition-all text-sm text-foreground placeholder:text-[#333]"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#666] ml-1">Passkey</label>
                                <input
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-[#0D0D0F] border border-border px-4 py-3 rounded-lg focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20 transition-all text-sm text-foreground placeholder:text-[#333]"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#666] ml-1">Confirm</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-[#0D0D0F] border border-border px-4 py-3 rounded-lg focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple/20 transition-all text-sm text-foreground placeholder:text-[#333]"
                                    required
                                />
                            </div>
                        </div>

                        <SubmitButton label="Instantiate Hub" />
                    </form>

                    <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                        <p className="text-[10px] text-[#444] uppercase tracking-widest font-medium">
                            Existing Operator? <Link href="/login" className="text-accent-purple hover:underline underline-offset-4">Auth Link</Link>
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(50px, 30px); }
        }
        @keyframes drift-reverse {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-50px, -30px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-drift { animation: drift 15s ease-in-out infinite; }
        .animate-drift-reverse { animation: drift-reverse 12s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
        </div>
    );
}

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus();

    return (
        <button
            disabled={pending}
            type="submit"
            className="w-full bg-accent-purple text-background font-display uppercase font-bold py-4 rounded-lg tracking-[0.2em] text-xs hover:shadow-[0_0_25px_rgba(167,139,250,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden mt-4"
        >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            {pending ? (
                <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Onboarding...</span>
                </div>
            ) : label}
        </button>
    );
}
