export default function BuilderPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-display italic tracking-tight">Agent Builder</h2>
                    <p className="text-muted text-sm tracking-widest uppercase mt-1">Configure & Instantiate Neural Assets</p>
                </div>
            </div>

            <div className="max-w-3xl glass p-8 rounded-2xl border-white/5 space-y-8 mx-auto mt-12">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-1 bg-accent-teal h-12" />
                    <h3 className="text-xl font-display lowercase tracking-tight">Stage 01: Core Parameters</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Agent Codename</label>
                        <div className="h-12 w-full bg-surface-secondary/50 rounded animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Neural Model</label>
                        <div className="h-12 w-full bg-surface-secondary/50 rounded animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Operational Role</label>
                        <div className="h-12 w-full bg-surface-secondary/50 rounded animate-pulse" />
                    </div>
                </div>

                <div className="pt-8 flex justify-end">
                    <div className="px-8 py-3 bg-accent-teal/10 border border-accent-teal/20 text-accent-teal rounded font-bold uppercase tracking-widest text-xs opacity-50 cursor-not-allowed">
                        Proceed to Skills
                    </div>
                </div>
            </div>
        </div>
    );
}
