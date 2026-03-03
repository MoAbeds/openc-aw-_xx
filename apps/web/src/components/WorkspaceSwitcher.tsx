"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus, Check, Briefcase } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { WorkspaceDTO } from "@apex-os/types";

export function WorkspaceSwitcher() {
    const { workspaces, workspaceId, setWorkspaces, switchWorkspace } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await api.get<any>("/api/workspaces");
                if (res.data) {
                    setWorkspaces(res.data);
                }
            } catch (err) {
                console.error("Failed to fetch workspaces", err);
            }
        };
        fetchWorkspaces();
    }, [setWorkspaces]);

    const currentWorkspace = workspaces.find(w => w.id === workspaceId);

    return (
        <div className="relative mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded bg-accent-teal/20 flex items-center justify-center shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-accent-teal" />
                    </div>
                    <span className="truncate font-bold tracking-tight text-foreground/80 group-hover:text-foreground">
                        {currentWorkspace?.name || "Select Workspace"}
                    </span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-muted transition-transform", isOpen ? "rotate-180" : "")} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D0D0F] border border-white/5 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-48 overflow-y-auto">
                            {workspaces.map((ws) => (
                                <button
                                    key={ws.id}
                                    onClick={() => {
                                        switchWorkspace(ws.id);
                                        setIsOpen(false);
                                        window.location.reload(); // Reload to refresh all workspace data
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-2.5 text-xs hover:bg-white/5 transition-colors",
                                        ws.id === workspaceId ? "text-accent-teal font-bold" : "text-muted"
                                    )}
                                >
                                    <span className="truncate">{ws.name}</span>
                                    {ws.id === workspaceId && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold text-muted hover:text-foreground hover:bg-white/5 transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                                New Workspace
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
