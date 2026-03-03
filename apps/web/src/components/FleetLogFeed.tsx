"use client";

import { useAgentStore } from "@/store/useAgentStore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function FleetLogFeed() {
    const globalLogs = useAgentStore((state) => state.globalLogs);

    return (
        <div className="w-[280px] h-full border-l border-border bg-black/40 flex flex-col">
            <div className="p-4 border-b border-white/5 bg-surface/50 backdrop-blur-sm">
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">Fleet Signal Feed</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px]">
                {globalLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-2">
                        <div className="w-1 h-8 bg-muted animate-pulse" />
                        <p className="uppercase tracking-widest italic">Idle Stream</p>
                    </div>
                )}

                {globalLogs.map((log) => (
                    <div key={log.id} className="space-y-1 group border-l-2 border-transparent hover:border-accent-teal/30 pl-2 transition-colors">
                        <div className="flex items-center gap-2 opacity-40">
                            <span className="text-accent-purple">[@{log.agentId.slice(0, 4)}]</span>
                            <span>{format(new Date(log.createdAt), "HH:mm:ss.SSS")}</span>
                        </div>
                        <p className={cn(
                            "break-words leading-relaxed",
                            log.level === "error" && "text-accent-orange",
                            log.level === "warn" && "text-yellow-500",
                            log.level === "success" && "text-accent-teal",
                            log.level === "info" && "text-foreground/80"
                        )}>
                            <span className="opacity-50 mr-1">{log.level === 'error' ? '✖' : '❯'}</span>
                            {log.message}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
