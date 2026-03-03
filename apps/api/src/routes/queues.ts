import type { FastifyPluginAsync } from "fastify";
import { agentCommandQueue, agentTaskQueue } from "../queues/index.js";

export const queueRoutes: FastifyPluginAsync = async (app) => {
    // ── GET /api/queues/stats ───────────────────────────────────────────────
    app.get(
        "/stats",
        {
            preHandler: [app.authenticate, app.authenticateAdmin],
            schema: {
                description: "Get statistics for all BullMQ worker queues",
                tags: ["System", "Admin"],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            // Using parallel fetching for fastest performance
            const [
                commandCounts,
                taskCounts,
                commandWaiting,
                taskWaiting
            ] = await Promise.all([
                agentCommandQueue.getJobCounts(),
                agentTaskQueue.getJobCounts(),
                agentCommandQueue.getWaitingCount(),
                agentTaskQueue.getWaitingCount(),
            ]);

            return reply.send({
                success: true,
                data: {
                    queues: {
                        agentCommands: {
                            counts: commandCounts,
                            waiting: commandWaiting,
                        },
                        agentTasks: {
                            counts: taskCounts,
                            waiting: taskWaiting,
                        },
                    },
                    timestamp: new Date().toISOString(),
                },
            });
        }
    );
};
