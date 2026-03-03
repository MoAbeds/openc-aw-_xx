import { Queue, Worker, QueueEvents } from "bullmq";
import type { Job } from "bullmq";
import { redis } from "../lib/redis.js"; // Reuse existing ioredis instance
import { db } from "../db/index.js";
import { agentLogs, agents } from "../db/schema.js";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { dockerManager } from "../services/DockerManager.js";
import type { AgentDTO } from "@apex-os/types";
import * as Sentry from "@sentry/node";
import { emailService } from "../services/EmailService.js";
import { PrometheusService } from "../services/PrometheusService.js";
import { pushNotificationService } from "../services/PushNotificationService.js";

// ── Queue Configuration ───────────────────────────────────────────────────

const queueOptions = {
    connection: redis as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000, // 1s, 5s, 15s... (actually BullMQ exponential base is 2 by default so 1s, 2s, 4s if delay=1000, 
            // but we just configure an exponential backoff standard)
        },
        removeOnComplete: {
            age: 3600, // keep for 1 hour
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed for 7 days
        },
    },
};

// ── Queues ──────────────────────────────────────────────────────────────────

export const agentCommandQueue = new Queue("agent-commands", queueOptions);
export const agentTaskQueue = new Queue("agent-tasks", queueOptions);
export const emailQueue = new Queue("emails", queueOptions);

// Initialize QueueEvents so we can add global listeners if needed
export const agentCommandEvents = new QueueEvents("agent-commands", { connection: redis as any });
export const agentTaskEvents = new QueueEvents("agent-tasks", { connection: redis as any });

// ── Shared DB Logger Helper ─────────────────────────────────────────────────
async function logToAgent(agentId: string, level: "info" | "warn" | "error" | "success", message: string) {
    const logEntry = {
        id: crypto.randomUUID(),
        agentId,
        level,
        message,
        createdAt: new Date().toISOString(),
    };
    await (db as any).insert(agentLogs).values(logEntry);

    // Broadcast via pub/sub locally if we needed to (already hooked up in routes, but worker might want to directly emit)
    // await redis.publish(`agent:logs:${agentId}`, JSON.stringify(logEntry));
}

// ── Workers ─────────────────────────────────────────────────────────────────

export const agentCommandWorker = new Worker(
    "agent-commands",
    async (job: Job) => {
        const { agentId, command } = job.data as { agentId: string; command: "start" | "stop" | "restart" };

        console.log(`[Worker] Executing command '${command}' for agent ${agentId}`);
        await logToAgent(agentId, "info", `Processing command: ${command}`);

        try {
            if (command === "start") {
                // Fetch full agent DTO for spawning
                const agent = await db.query.agents.findFirst({
                    where: eq(agents.id, agentId),
                    with: { skills: true }
                });

                if (!agent) throw new Error("Agent not found in DB");

                await dockerManager.spawnAgent(agent as any as AgentDTO);

                // Start log streaming to Redis
                dockerManager.streamLogs(agentId, (line) => {
                    redis.publish(`agent:logs:${agentId}`, JSON.stringify({
                        id: crypto.randomUUID(),
                        agentId,
                        level: "info",
                        message: line,
                        createdAt: new Date().toISOString()
                    }));
                });
            } else if (command === "stop") {
                await dockerManager.stopAgent(agentId);
            } else if (command === "restart") {
                await dockerManager.restartAgent(agentId);
            }

            let newStatus = "idle";
            if (command === "start" || command === "restart") {
                newStatus = "active";
            }

            await (db as any)
                .update(agents)
                .set({ status: newStatus, updatedAt: new Date().toISOString() })
                .where(eq(agents.id, agentId));

            await logToAgent(agentId, "success", `Command '${command}' completed successfully`);
            return { success: true, status: newStatus };
        } catch (err: any) {
            console.error(`Command '${command}' failed for agent ${agentId}:`, err);
            await logToAgent(agentId, "error", `${command} failed: ${err.message}`);
            throw err;
        }
    },
    { connection: redis as any }
);

export const agentTaskWorker = new Worker(
    "agent-tasks",
    async (job: Job) => {
        const { agentId, taskType, payload } = job.data as { agentId: string; taskType: string; payload: any };

        console.log(`[Worker] Delegating task '${taskType}' to agent ${agentId}`);
        await logToAgent(agentId, "info", `Started task: ${taskType}`);

        // Mock execution delay
        await new Promise((res) => setTimeout(res, 3000));

        // Record metrics
        const agent = await db.query.agents.findFirst({ where: eq(agents.id, agentId) });
        if (agent) PrometheusService.recordTaskCompletion(agentId, agent.name);

        await logToAgent(agentId, "success", `Completed task: ${taskType}`);

        // ── Result Callback Logic ───────────────────────────────────────────
        // In SQLite, JSON fields handled by $type<..> are automatic, but metadata might be string.
        const taskInDb = await db.query.agentTasks.findFirst({
            where: (t, { eq }) => eq(t.id, job.data.taskId)
        });

        if (taskInDb?.metadata) {
            const metadata = typeof taskInDb.metadata === "string"
                ? JSON.parse(taskInDb.metadata)
                : taskInDb.metadata;

            if ((metadata as any).parentAgentId) {
                const parentId = (metadata as any).parentAgentId;
                // Notify Parent Agent of mission completion (Internal IPC)
                await redis.publish(`agent:events:${parentId}`, JSON.stringify({
                    type: "delegation_result",
                    subAgentId: agentId,
                    taskId: job.data.taskId,
                    result: { success: true, mocked: true }
                }));
                await logToAgent(parentId, "info", `Received result from sub-agent ${agentId} for task ${taskType}`);

                // 2. Notify Frontend via Workspace Channel (Visual)
                if (agent) {
                    await redis.publish(`workspace:fleet:${agent.workspaceId}`, JSON.stringify({
                        type: "delegation_event",
                        payload: {
                            sourceAgentId: parentId,
                            targetAgentId: agentId,
                            taskId: job.data.taskId,
                            status: "completed"
                        }
                    }));
                }
            }
        }
        if (agent) {
            await pushNotificationService.notifyWorkspace(agent.workspaceId, {
                title: "Task Completed",
                body: `Agent ${agent.name} finished task: ${taskType}`,
                agentId: agent.id,
                action: "VIEW_TASK"
            });
        }

        return { success: true, result: { mocked: true } };
    },
    { connection: redis as any }
);

export const emailWorker = new Worker(
    "emails",
    async (job: Job) => {
        const { to, subject, templateId, props } = job.data as { to: string; subject: string; templateId: string; props: any };
        console.log(`[EmailWorker] Processing ${templateId} for ${to}`);

        const templateFn = (emailService.templates as any)[templateId];
        if (!templateFn) {
            console.error(`Unknown template: ${templateId}`);
            return;
        }

        const html = templateFn(props);
        await emailService.sendEmail(to, subject, html);
        return { success: true };
    },
    { connection: redis as any }
);

// ── Worker Event Listeners ──────────────────────────────────────────────────

agentCommandWorker.on("failed", async (job, err) => {
    if (job) {
        console.error(`[Worker] Job ${job.id} failed:`, err);
        const { agentId } = job.data;
        if (agentId) await logToAgent(agentId, "error", `Command failed: ${err.message}`);
    }
});

agentTaskWorker.on("failed", async (job, err) => {
    if (job) {
        console.error(`[Worker] Task job ${job.id} failed:`, err);
        const { agentId } = job.data;
        if (agentId) {
            await logToAgent(agentId, "error", `Task execution failed: ${err.message}`);

            // Fetch agent and workspace owner to alert
            const agent = await db.query.agents.findFirst({
                where: eq(agents.id, agentId),
                with: { workspace: { with: { owner: true } } }
            });

            if (agent?.workspace?.owner?.email) {
                // Send push notification
                await pushNotificationService.notifyWorkspace(agent.workspaceId, {
                    title: "Agent Error",
                    body: `Agent ${agent.name} encountered an error: ${err.message}`,
                    agentId: agent.id,
                    action: "VIEW_ERROR"
                });

                await emailQueue.add("agent_error", {
                    to: agent.workspace.owner.email,
                    subject: `Alert: Agent Node Failure [${agent.name}]`,
                    templateId: "agentError",
                    props: {
                        agentName: agent.name,
                        errorMessage: err.message,
                        agentId: agent.id
                    }
                }, { priority: 1 }); // Alerts take priority

                // Report to Sentry
                Sentry.withScope((scope) => {
                    scope.setTag("agentId", agentId);
                    scope.setTag("workspaceId", agent.workspaceId);
                    scope.setTag("agentName", agent.name);
                    scope.setExtra("jobId", job.id);
                    Sentry.captureException(err);
                });
            }
        }
    }
});

/**
 * Clean up function for majestic Fastify exit.
 */
export async function closeQueuesAndWorkers() {
    await agentCommandWorker.close();
    await agentTaskWorker.close();
    await emailWorker.close();
    await agentCommandQueue.close();
    await agentTaskQueue.close();
    await emailQueue.close();
    await agentCommandEvents.close();
    await agentTaskEvents.close();
}
