import { create } from "zustand";
import { AgentDTO, AgentLogEntry } from "@apex-os/types";
import { api } from "../lib/api";

interface AgentState {
    agents: AgentDTO[];
    loading: boolean;
    error: string | null;
    selectedAgentId: string | null;
    globalLogs: AgentLogEntry[];

    fetchAgents: () => Promise<void>;
    updateAgentStatus: (agentId: string, status: string) => void;
    addAgent: (agent: AgentDTO) => void;
    setSelectedAgentId: (id: string | null) => void;
    addLog: (log: AgentLogEntry) => void;
}

export const useAgentStore = create<AgentState>()((set, get) => ({
    agents: [],
    loading: false,
    error: null,
    selectedAgentId: null,
    globalLogs: [],

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
}));
