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
    companyName: text("company_name"),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color").default("#00FFD1"),
    slug: text("slug").unique(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    ...timestamps,
});

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    owner: one(users, {
        fields: [workspaces.ownerId],
        references: [users.id],
    }),
    agents: many(agents),
    members: many(workspaceMembers),
}));

// ─────────────────────────────────────────────────────────────────────────────
// workspace_members
// ─────────────────────────────────────────────────────────────────────────────

export const workspaceMembers = sqliteTable("workspace_members", {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "member", "viewer"] })
        .notNull()
        .default("member"),
    ...timestamps,
});

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [workspaceMembers.workspaceId],
        references: [workspaces.id],
    }),
    user: one(users, {
        fields: [workspaceMembers.userId],
        references: [users.id],
    }),
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
    status: text("status", { enum: ["active", "idle", "disabled", "deleted", "error"] })
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
    workspaceId: text("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
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
    workspace: one(workspaces, {
        fields: [agentLogs.workspaceId],
        references: [workspaces.id],
    }),
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
    workspaceId: text("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
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
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    ...timestamps,
    ...updatedAt,
});

export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [agentTasks.workspaceId],
        references: [workspaces.id],
    }),
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
// workflows
// ─────────────────────────────────────────────────────────────────────────────

export const workflows = sqliteTable("workflows", {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    steps: text("steps", { mode: "json" }).$type<Array<{
        id: string;
        agentId: string;
        action: string;
        config: Record<string, any>;
        nextStepId?: string;
    }>>().notNull(),
    triggerId: text("trigger_id"), // manual, cron:..., etc
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
    ...updatedAt,
});

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
    workspace: one(workspaces, {
        fields: [workflows.workspaceId],
        references: [workspaces.id],
    }),
    runs: many(workflowRuns),
}));

// ─────────────────────────────────────────────────────────────────────────────
// workflow_runs
// ─────────────────────────────────────────────────────────────────────────────

export const workflowRuns = sqliteTable("workflow_runs", {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
        .notNull()
        .references(() => workflows.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
        .notNull()
        .references(() => workspaces.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["running", "completed", "failed", "cancelled"] })
        .notNull()
        .default("running"),
    currentStepId: text("current_step_id"),
    context: text("context", { mode: "json" }).$type<Record<string, any>>().default({}),
    error: text("error"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    ...timestamps,
});

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
    workflow: one(workflows, {
        fields: [workflowRuns.workflowId],
        references: [workflows.id],
    }),
    workspace: one(workspaces, {
        fields: [workflowRuns.workspaceId],
        references: [workspaces.id],
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// push_subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export const pushSubscriptions = sqliteTable("push_subscriptions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    ...timestamps,
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
    user: one(users, {
        fields: [pushSubscriptions.userId],
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
    workspaceMembers,
    workspaceMembersRelations,
    workflows,
    workflowsRelations,
    workflowRuns,
    workflowRunsRelations,
    pushSubscriptions,
    pushSubscriptionsRelations,
};
