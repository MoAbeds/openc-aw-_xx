import { FastifyInstance } from "fastify";
import { dockerManager } from "../services/DockerManager.js";
import { db } from "../db/index.js";
import { agents, agentTasks } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { agentTaskQueue } from "../queues/index.js";
import { nanoid } from "nanoid";

/**
 * Internal Communication Protocol for Agent-to-Agent Delegation.
 * These routes are used by the agents themselves within the Docker network.
 */
export async function internalAgentRoutes(app: FastifyInstance) {
    // ── POST /api/internal/delegate ──────────────────────────────────────────
    app.post("/delegate", async (req, reply) => {
        const { targetAgentId, task, payload } = req.body as {
            targetAgentId: string;
            task: string;
            payload?: any;
        };

        const remoteIp = req.ip;
        const containers = await dockerManager.listAgentContainers();
        const sourceContainer = containers.find(c => {
            const net = c.NetworkSettings?.Networks?.["apex-network"];
            return net?.IPAddress === remoteIp;
        });

        if (!sourceContainer) {
            req.log.error({ remoteIp }, "Unauthorized Internal Access: Source not found.");
            return reply.code(403).send({ error: "Unauthorized access: Source agent not identified." });
        }

        const sourceAgentId = sourceContainer.Labels["apex.agentId"];

        // Use findFirst for cross-dialect compatibility (SQLite / Postgres)
        const sourceAgent = await db.query.agents.findFirst({
            where: eq(agents.id, sourceAgentId)
        });

        const targetAgent = await db.query.agents.findFirst({
            where: eq(agents.id, targetAgentId)
        });

        if (!targetAgent || !sourceAgent) {
            return reply.code(404).send({ error: "Agent protocol identification failure." });
        }

        if (sourceAgent.workspaceId !== targetAgent.workspaceId) {
            return reply.code(403).send({ error: "Collaboration Protocol Violation." });
        }

        // 3. Task Enqueuing
        const taskId = nanoid();
        await (db as any).insert(agentTasks).values({
            id: taskId,
            workspaceId: targetAgent.workspaceId,
            agentId: targetAgentId,
            type: task,
            status: "pending",
            payload: payload || {},
            metadata: {
                parentAgentId: sourceAgentId,
                type: "delegated_task"
            },
            createdAt: new Date().toISOString()
        });

        await agentTaskQueue.add("mission", {
            taskId,
            agentId: targetAgentId,
            taskType: task,
            payload
        });

        req.log.info({ sourceAgentId, targetAgentId, taskId }, "Agent Task Delegated");

        return reply.send({ success: true, taskId });
    });
}
