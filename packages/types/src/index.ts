// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for apex-os
// ─────────────────────────────────────────────────────────────────────────────

// ── Generic API shapes ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ── User & Auth ───────────────────────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
}

export type UserRole = "admin" | "member" | "viewer";

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface LoginPayload {
    email: string;
    password: string;
}

// ── Health check ─────────────────────────────────────────────────────────────

export interface HealthStatus {
    status: "ok" | "degraded" | "down";
    version: string;
    uptime: number;
    timestamp: string;
}

// ── Environment ───────────────────────────────────────────────────────────────

export type Environment = "development" | "staging" | "production";

// ── Agents ────────────────────────────────────────────────────────────────────

export type AgentStatus = "active" | "idle" | "disabled" | "deleted" | "error";
export type LogLevel = "info" | "warn" | "error" | "success";
export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface AgentSkill {
    id: string;
    agentId: string;
    skillName: string;
    config: Record<string, unknown> | null;
    enabled: boolean;
}

export interface AgentLogEntry {
    id: string;
    agentId: string;
    level: LogLevel;
    message: string;
    createdAt: string;
}

export interface AgentTask {
    id: string;
    agentId: string;
    type: string;
    payload: Record<string, unknown> | null;
    status: TaskStatus;
    result: Record<string, unknown> | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
}

export interface AgentDTO {
    id: string;
    workspaceId: string;
    name: string;
    role: string;
    model: string;
    status: AgentStatus;
    parentId: string | null;
    channel: string | null;
    persona: string | null;
    color: string | null;
    avatar: string | null;
    createdAt: string;
    updatedAt: string;
    children?: AgentDTO[];
    skills?: AgentSkill[];
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export interface WorkspaceDTO {
    id: string;
    name: string;
    ownerId: string;
    plan: "free" | "pro" | "enterprise";
    createdAt: string;
    updatedAt: string;
    role?: "owner" | "admin" | "member" | "viewer";
}

