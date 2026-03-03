import {
    sqliteTable,
    text,
    integer,
    real,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const timestamps = {
    createdAt: text("created_at")
        .notNull()
        .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
};

const updatedAt = {
    updatedAt: text("updated_at")
        .notNull()
        .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
};

// ─────────────────────────────────────────────────────────────────────────────
// users
// ─────────────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
    ...timestamps,
});

export const usersRelations = relations(users, ({ many }) => ({
    workspaces: many(workspaces),
    sessions: many(sessions),
}));

// ─────────────────────────────────────────────────────────────────────────────
// workspaces
// ─────────────────────────────────────────────────────────────────────────────

export const workspaces = sqliteTable("workspaces", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan", { enum: ["free", "pro", "enterprise"] })
        .notNull()
        .default("free"),
    ...timestamps,
});

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    owner: one(users, {
        fields: [workspaces.ownerId],
        references: [users.id],
    }),
    agents: many(agents),
}));

// ─────────────────────────────────────────────────────────────────────────────
// agents
// ─────────────────────────────────────────────────────────────────────────────

export const agents = sqliteTable("agents", {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").notNull(),
    model: text("model").notNull().default("gpt-4o"),
    status: text("status", { enum: ["active", "idle", "disabled", "deleted"] })
        .notNull()
        .default("idle"),
    // self-referential: optional parent agent
    parentId: text("parent_id"),
    channel: text("channel"),
    persona: text("persona"),
    color: text("color"),
    avatar: text("avatar"),
    ...timestamps,
    ...updatedAt,
});

export const agentsRelations = relations(agents, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [agents.workspaceId],
        references: [workspaces.id],
    }),
    parent: one(agents, {
        fields: [agents.parentId],
        references: [agents.id],
        relationName: "agentHierarchy",
    }),
    children: many(agents, { relationName: "agentHierarchy" }),
    skills: many(agentSkills),
    logs: many(agentLogs),
    tasks: many(agentTasks),
}));

// ─────────────────────────────────────────────────────────────────────────────
// agent_skills
// ─────────────────────────────────────────────────────────────────────────────

export const agentSkills = sqliteTable("agent_skills", {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
        .notNull()
        .references(() => agents.id, { onDelete: "cascade" }),
    skillName: text("skill_name").notNull(),
    config: text("config", { mode: "json" }).$type<Record<string, unknown>>(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const agentSkillsRelations = relations(agentSkills, ({ one }) => ({
    agent: one(agents, {
        fields: [agentSkills.agentId],
        references: [agents.id],
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// agent_logs
// ─────────────────────────────────────────────────────────────────────────────

export const agentLogs = sqliteTable("agent_logs", {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
        .notNull()
        .references(() => agents.id, { onDelete: "cascade" }),
    level: text("level", { enum: ["info", "warn", "error", "success"] })
        .notNull()
        .default("info"),
    message: text("message").notNull(),
    ...timestamps,
});

export const agentLogsRelations = relations(agentLogs, ({ one }) => ({
    agent: one(agents, {
        fields: [agentLogs.agentId],
        references: [agents.id],
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// agent_tasks
// ─────────────────────────────────────────────────────────────────────────────

export const agentTasks = sqliteTable("agent_tasks", {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
        .notNull()
        .references(() => agents.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    status: text("status", {
        enum: ["pending", "running", "completed", "failed"],
    })
        .notNull()
        .default("pending"),
    result: text("result", { mode: "json" }).$type<Record<string, unknown>>(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    ...timestamps,
});

export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
    agent: one(agents, {
        fields: [agentTasks.agentId],
        references: [agents.id],
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// sessions
// ─────────────────────────────────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    ...timestamps,
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Re-export schema map (used by drizzle-kit)
// ─────────────────────────────────────────────────────────────────────────────

export const schema = {
    users,
    usersRelations,
    workspaces,
    workspacesRelations,
    agents,
    agentsRelations,
    agentSkills,
    agentSkillsRelations,
    agentLogs,
    agentLogsRelations,
    agentTasks,
    agentTasksRelations,
    sessions,
    sessionsRelations,
};
