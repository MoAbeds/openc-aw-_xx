import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserDTO } from "@apex-os/types";

interface AuthState {
    user: UserDTO | null;
    workspaceId: string | null;
    token: string | null;
    setAuth: (user: UserDTO, token: string, workspaceId: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            workspaceId: null,
            token: null,
            setAuth: (user, token, workspaceId) => {
                if (typeof window !== "undefined") {
                    localStorage.setItem("apex_token", token);
                }
                set({ user, token, workspaceId });
            },
            logout: () => {
                if (typeof window !== "undefined") {
                    localStorage.removeItem("apex_token");
                }
                set({ user: null, token: null, workspaceId: null });
            },
        }),
        {
            name: "apex-auth-storage",
        }
    )
);
