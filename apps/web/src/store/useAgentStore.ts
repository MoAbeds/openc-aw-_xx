import { create } from "zustand";
import type { AgentDTO, AgentLogEntry } from "@apex-os/types";
import { api } from "../lib/api";

interface AgentState {
    agents: AgentDTO[];
    loading: boolean;
    error: string | null;
    selectedAgentId: string | null;
    globalLogs: AgentLogEntry[];
    delegationEvents: Array<{
        sourceAgentId: string;
        targetAgentId: string;
        taskId: string;
        status: "pending" | "completed";
    }>;

    fetchAgents: () => Promise<void>;
    updateAgentStatus: (agentId: string, status: string) => void;
    addAgent: (agent: AgentDTO) => void;
    setSelectedAgentId: (id: string | null) => void;
    addLog: (log: AgentLogEntry) => void;
    addDelegationEvent: (event: { sourceAgentId: string; targetAgentId: string; taskId: string; status: "pending" | "completed" }) => void;
    marketplaceSkills: any[];
    fetchMarketplaceSkills: () => Promise<void>;
    installSkill: (agentId: string, marketplaceSkillId: string) => Promise<void>;
    removeSkill: (agentId: string, skillId: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
    agents: [],
    loading: false,
    error: null,
    selectedAgentId: null,
    globalLogs: [],
    delegationEvents: [],
    marketplaceSkills: [],

    fetchAgents: async () => {
        set({ loading: true });
        try {
            const data = await api.get<AgentDTO[]>("/api/agents");
            set({ agents: data, loading: false });
            // Select first agent by default if none selected
            if (data && data.length > 0 && !get().selectedAgentId) {
                const firstAgent = data[0];
                if (firstAgent) set({ selectedAgentId: firstAgent.id });
            }
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    updateAgentStatus: (agentId, status) => {
        set((state) => ({
            agents: state.agents.map((a) =>
                a.id === agentId ? { ...a, status: status as any } : a
            ),
        }));
    },

    addAgent: (agent) => {
        set((state) => ({
            agents: [agent, ...state.agents],
        }));
    },

    setSelectedAgentId: (id) => set({ selectedAgentId: id }),

    addLog: (log) => {
        set((state) => ({
            globalLogs: [log, ...state.globalLogs].slice(0, 200), // Keep last 200
        }));
    },

    addDelegationEvent: (event) => {
        set((state) => ({
            delegationEvents: [...state.delegationEvents, event]
        }));

        // Auto-remove animation after 3 seconds
        setTimeout(() => {
            set((state) => ({
                delegationEvents: state.delegationEvents.filter((e) => e.taskId !== event.taskId)
            }));
        }, 3000);
    },

    fetchMarketplaceSkills: async () => {
        try {
            const { data } = await api.get<{ data: any[] }>("/api/agents/skills/marketplace");
            set({ marketplaceSkills: data });
        } catch (err: any) {
            console.error("Marketplace fetch error:", err);
        }
    },

    installSkill: async (agentId, marketplaceSkillId) => {
        await api.post(`/api/agents/${agentId}/skills/install`, { marketplaceSkillId });
        await get().fetchAgents(); // Refresh agent data to show new skill
    },

    removeSkill: async (agentId, skillId) => {
        await api.delete(`/api/agents/${agentId}/skills/${skillId}`);
        await get().fetchAgents();
    }
}));
