import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, WorkspaceDTO } from "@apex-os/types";

interface AuthState {
    user: User | null;
    workspaceId: string | null;
    workspaces: WorkspaceDTO[];
    token: string | null;
    setAuth: (user: User, token: string, workspaceId: string) => void;
    setWorkspaces: (workspaces: WorkspaceDTO[]) => void;
    switchWorkspace: (workspaceId: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            workspaceId: null,
            workspaces: [],
            token: null,
            setAuth: (user, token, workspaceId) => {
                if (typeof window !== "undefined") {
                    localStorage.setItem("apex_token", token);
                }
                set({ user, token, workspaceId });
            },
            setWorkspaces: (workspaces) => set({ workspaces }),
            switchWorkspace: (workspaceId) => set({ workspaceId }),
            logout: () => {
                if (typeof window !== "undefined") {
                    localStorage.removeItem("apex_token");
                }
                set({ user: null, token: null, workspaceId: null, workspaces: [] });
            },
        }),
        {
            name: "apex-auth-storage",
        }
    )
);
