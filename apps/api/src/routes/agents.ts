import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../db/index.js";
import { agents, agentSkills, agentLogs, agentTasks } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import type { AgentDTO, AgentSkill } from "@apex-os/types";
import { redis } from "../lib/redis.js";

// ── Zod Validation Schemas ────────────────────────────────────────────────

const createAgentSchema = z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    model: z.string().optional(),
    parentId: z.string().optional(),
    channel: z.string().optional(),
    persona: z.string().optional(),
    color: z.string().optional(),
    avatar: z.string().optional(),
});

const updateAgentSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    model: z.string().optional(),
    status: z.enum(["active", "idle", "disabled", "deleted"]).optional(),
    channel: z.string().optional(),
    persona: z.string().optional(),
    color: z.string().optional(),
    avatar: z.string().optional(),
});

const createSkillSchema = z.object({
    skillName: z.string().min(1),
    config: z.record(z.any()).optional().nullable(),
});

// ── Route Handlers ────────────────────────────────────────────────────────

export const agentRoutes: FastifyPluginAsync = async (app) => {
    // ── Helper to ensure workspace isolation ────────────────────────────────
    const verifyAgentAccess = async (agentId: string, workspaceId: string) => {
        const agent = await db.query.agents.findFirst({
            where: and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)),
        });
        return agent;
    };

    // ── GET /agents ─────────────────────────────────────────────────────────
    app.get(
        "/",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { workspaceId } = request.user;
            if (!workspaceId) {
                return reply.code(403).send({ error: "Forbidden", message: "No active workspace" });
            }

            const allAgents = await db.query.agents.findMany({
                where: and(eq(agents.workspaceId, workspaceId)),
                orderBy: [desc(agents.createdAt)],
            });

            // Filter out purely deleted unless requested? The prompt just says "list all agents".
            // Let's filter deleted ones since soft delete usually implies hiding from standard views.
            const visibleAgents = allAgents.filter((a) => a.status !== "deleted") as AgentDTO[];

            return reply.send({ data: visibleAgents });
        }
    );

    // ── POST /agents ────────────────────────────────────────────────────────
    app.post(
        "/",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { workspaceId } = request.user;
            if (!workspaceId) {
                return reply.code(403).send({ error: "Forbidden", message: "No active workspace" });
            }

            const payload = createAgentSchema.parse(request.body);
            const agentId = crypto.randomUUID();

            await (db as any).insert(agents).values({
                id: agentId,
                workspaceId,
                status: "idle",
                ...payload,
            });

            const newAgent = await db.query.agents.findFirst({ where: eq(agents.id, agentId) });
            return reply.code(201).send({ data: newAgent as AgentDTO });
        }
    );

    // ── GET /agents/:id ─────────────────────────────────────────────────────
    app.get(
        "/:id",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await db.query.agents.findFirst({
                where: and(eq(agents.id, id), eq(agents.workspaceId, workspaceId)),
                with: {
                    children: true,
                    skills: true,
                },
            });

            if (!agent || agent.status === "deleted") {
                return reply.code(404).send({ error: "Not Found", message: "Agent not found" });
            }

            return reply.send({ data: agent as AgentDTO });
        }
    );

    // ── PATCH /agents/:id ───────────────────────────────────────────────────
    app.patch(
        "/:id",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent || agent.status === "deleted") {
                return reply.code(404).send({ error: "Not Found", message: "Agent not found" });
            }

            const updates = updateAgentSchema.parse(request.body);

            // Using any trick until Drizzle sqlite/pg update union issue is bypassed
            await (db as any)
                .update(agents)
                .set({ ...updates, updatedAt: new Date().toISOString() })
                .where(eq(agents.id, id));

            const updatedAgent = await db.query.agents.findFirst({ where: eq(agents.id, id) });
            return reply.send({ data: updatedAgent as AgentDTO });
        }
    );

    // ── DELETE /agents/:id ──────────────────────────────────────────────────
    app.delete(
        "/:id",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent || agent.status === "deleted") {
                return reply.code(404).send({ error: "Not Found", message: "Agent not found" });
            }

            // Soft-delete
            await (db as any)
                .update(agents)
                .set({ status: "deleted", updatedAt: new Date().toISOString() })
                .where(eq(agents.id, id));

            return reply.send({ success: true, message: "Agent deleted successfully" });
        }
    );

    // ── POST /agents/:id/start ──────────────────────────────────────────────
    app.post(
        "/:id/start",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent || agent.status === "deleted") return reply.code(404).send({ error: "Not Found", message: "Agent not found" });

            // Mock phase 3 implementation
            await (db as any).update(agents).set({ status: "active", updatedAt: new Date().toISOString() }).where(eq(agents.id, id));

            const logEntry = { id: crypto.randomUUID(), agentId: id, level: "info", message: "Agent container started", createdAt: new Date().toISOString() };
            await (db as any).insert(agentLogs).values(logEntry);

            // Broadcast events
            await redis.publish(`workspace:fleet:${workspaceId}`, JSON.stringify({ type: "agent_status", agentId: id, status: "active" }));
            await redis.publish(`agent:logs:${id}`, JSON.stringify(logEntry));

            return reply.send({ success: true, message: "Agent started" });
        }
    );

    // ── POST /agents/:id/stop ───────────────────────────────────────────────
    app.post(
        "/:id/stop",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent || agent.status === "deleted") return reply.code(404).send({ error: "Not Found", message: "Agent not found" });

            // Mock phase 3 implementation
            await (db as any).update(agents).set({ status: "idle", updatedAt: new Date().toISOString() }).where(eq(agents.id, id));

            const logEntry = { id: crypto.randomUUID(), agentId: id, level: "info", message: "Agent container stopped", createdAt: new Date().toISOString() };
            await (db as any).insert(agentLogs).values(logEntry);

            // Broadcast events
            await redis.publish(`workspace:fleet:${workspaceId}`, JSON.stringify({ type: "agent_status", agentId: id, status: "idle" }));
            await redis.publish(`agent:logs:${id}`, JSON.stringify(logEntry));

            return reply.send({ success: true, message: "Agent stopped" });
        }
    );

    // ── POST /agents/:id/restart ────────────────────────────────────────────
    app.post(
        "/:id/restart",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent || agent.status === "deleted") return reply.code(404).send({ error: "Not Found", message: "Agent not found" });

            // Mock phase 3 implementation
            await (db as any).update(agents).set({ status: "active", updatedAt: new Date().toISOString() }).where(eq(agents.id, id));

            const logEntry = { id: crypto.randomUUID(), agentId: id, level: "warn", message: "Agent container restarted", createdAt: new Date().toISOString() };
            await (db as any).insert(agentLogs).values(logEntry);

            // Broadcast events
            await redis.publish(`workspace:fleet:${workspaceId}`, JSON.stringify({ type: "agent_status", agentId: id, status: "active" }));
            await redis.publish(`agent:logs:${id}`, JSON.stringify(logEntry));

            return reply.send({ success: true, message: "Agent restarted" });
        }
    );

    // ── GET /agents/:id/logs ────────────────────────────────────────────────
    app.get(
        "/:id/logs",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent) return reply.code(404).send({ error: "Not Found", message: "Agent not found" });

            const logs = await db.query.agentLogs.findMany({
                where: eq(agentLogs.agentId, id),
                orderBy: [desc(agentLogs.createdAt)],
                limit: 100,
            });

            return reply.send({ data: logs });
        }
    );

    // ── GET /agents/:id/tasks ───────────────────────────────────────────────
    app.get(
        "/:id/tasks",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent) return reply.code(404).send({ error: "Not Found", message: "Agent not found" });

            const tasks = await db.query.agentTasks.findMany({
                where: eq(agentTasks.agentId, id),
                orderBy: [desc(agentTasks.createdAt)],
                limit: 100, // Reasonable cap
            });

            return reply.send({ data: tasks });
        }
    );

    // ── POST /agents/:id/skills ─────────────────────────────────────────────
    app.post(
        "/:id/skills",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent || agent.status === "deleted") return reply.code(404).send({ error: "Not Found", message: "Agent not found" });

            const payload = createSkillSchema.parse(request.body);
            const skillId = crypto.randomUUID();

            await (db as any).insert(agentSkills).values({
                id: skillId,
                agentId: id,
                ...payload,
            });

            const newSkill = await db.query.agentSkills.findFirst({ where: eq(agentSkills.id, skillId) });
            return reply.code(201).send({ data: newSkill as AgentSkill });
        }
    );

    // ── DELETE /agents/:id/skills/:skillId ──────────────────────────────────
    app.delete(
        "/:id/skills/:skillId",
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const { id, skillId } = request.params as { id: string; skillId: string };
            const { workspaceId } = request.user;
            if (!workspaceId) return reply.code(403).send({ error: "Forbidden", message: "No workspace" });

            const agent = await verifyAgentAccess(id, workspaceId);
            if (!agent || agent.status === "deleted") return reply.code(404).send({ error: "Not Found", message: "Agent not found" });

            await (db as any).delete(agentSkills).where(and(eq(agentSkills.id, skillId), eq(agentSkills.agentId, id)));

            return reply.send({ success: true, message: "Skill removed" });
        }
    );
};
