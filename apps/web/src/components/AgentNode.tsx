"use client";

import { AgentDTO } from "@apex-os/types";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Circle, Zap, Shield, MessageSquare, Monitor } from "lucide-react";
import { useState } from "react";
import { useAgentStore } from "@/store/useAgentStore";

interface AgentNodeProps {
    agent: AgentDTO;
    level: number;
}

export function AgentNode({ agent, level }: AgentNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const { selectedAgentId, setSelectedAgentId, agents } = useAgentStore();

    const children = agents.filter(a => a.parentId === agent.id);
    const isSelected = selectedAgentId === agent.id;
    const hasChildren = children.length > 0;

    const StatusIcon = agent.status === "active" ? Zap : Circle;
    const channelIconMap: Record<string, any> = {
        slack: MessageSquare,
        discord: Shield,
        default: Monitor,
    };
    const ChannelIcon = channelIconMap[agent.channel || "default"] || Monitor;

    return (
        <div className="select-none">
            <div
                onClick={() => setSelectedAgentId(agent.id)}
                className={cn(
                    "group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-200 relative",
                    isSelected ? "bg-accent-teal/10 text-accent-teal" : "text-muted hover:text-foreground hover:bg-surface-secondary",
                    level > 0 && "ml-4"
                )}
            >
                {/* Connection Line for Children */}
                {level > 0 && (
                    <div className="absolute left-[-12px] top-[-10px] bottom-1/2 w-[1px] border-l border-dashed border-white/10" />
                )}
                {level > 0 && (
                    <div className="absolute left-[-12px] top-1/2 w-3 border-t border-dashed border-white/10" />
                )}

                <div className="flex items-center gap-1 min-w-[20px]">
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="p-0.5 hover:bg-white/5 rounded"
                        >
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                    ) : (
                        <div className="w-3" />
                    )}
                </div>

                <div className="relative">
                    <div className={cn(
                        "w-6 h-6 rounded-md border border-border flex items-center justify-center bg-surface overflow-hidden",
                        isSelected && "border-accent-teal/50 shadow-[0_0_10px_rgba(0,255,209,0.2)]"
                    )}>
                        {agent.avatar ? <img src={agent.avatar} alt="" className="w-full h-full object-cover" /> : <ChannelIcon className="w-3 h-3" />}
                    </div>
                    <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background",
                        agent.status === "active" ? "bg-accent-teal animate-pulse" : "bg-muted"
                    )} />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-medium truncate">{agent.name}</span>
                    <span className="text-[9px] uppercase tracking-tighter opacity-50 truncate">{agent.role}</span>
                </div>

                {isSelected && (
                    <div className="w-1 h-3 bg-accent-teal rounded-full" />
                )}
            </div>

            {hasChildren && isExpanded && (
                <div className="mt-0.5">
                    {children.map(child => (
                        <AgentNode key={child.id} agent={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
