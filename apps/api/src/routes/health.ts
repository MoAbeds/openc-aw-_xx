import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { redis } from "../lib/redis.js";
import { dockerManager } from "../services/DockerManager.js";
import { sql, eq } from "drizzle-orm";
import { agents } from "../db/schema.js";
import { agentTaskQueue } from "../queues/index.js";
import { register } from "../services/PrometheusService.js";

const startTime = Date.now();

const healthResponseSchema = z.object({
    status: z.enum(["ok", "degraded", "down"]),
    version: z.string(),
    uptime: z.number(),
    timestamp: z.string(),
    checks: z.object({
        database: z.string(),
        redis: z.string(),
        docker: z.string(),
    }),
});

export const healthRoutes: FastifyPluginAsync = async (app) => {
    // ── GET /api/health ────────────────────────────────────────────────────────
    app.get(
        "/health",
        {
            schema: {
                description: "System health check",
                tags: ["System"],
            },
        },
        async (_request, reply) => {
            const status = await checkHealth();
            return reply.code(status.overallStatus === "down" ? 503 : 200).send({
                status: status.overallStatus,
                version: process.env.npm_package_version ?? "0.0.1",
                uptime: Math.floor((Date.now() - startTime) / 1000),
                timestamp: new Date().toISOString(),
                checks: {
                    database: status.dbStatus,
                    redis: status.redisStatus,
                    docker: status.dockerStatus,
                },
            });
        }
    );

    // ── GET /api/health/detailed ────────────────────────────────────────────────
    app.get(
        "/health/detailed",
        {
            schema: {
                description: "Detailed system telemetry report",
                tags: ["System"],
                security: [{ bearerAuth: [] }],
            },
        },
        async (_request, reply) => {
            const status = await checkHealth();
            const [activeAgents] = await (db as any).select({ count: sql`count(*)` }).from(agents).where(eq(agents.status, "active"));
            const queueWaiting = await agentTaskQueue.getWaitingCount();

            return reply.send({
                ...status,
                agentsRunning: activeAgents.count || 0,
                queueDepth: queueWaiting,
                uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
                timestamp: new Date().toISOString(),
            });
        }
    );

    // ── GET /metrics ───────────────────────────────────────────────────────
    app.get(
        "/metrics",
        {
            schema: {
                description: "Prometheus standard metrics",
                tags: ["System"],
            }
        },
        async (_request, reply) => {
            return reply.send(await register.metrics());
        }
    );
};

async function checkHealth() {
    let dbStatus = "ok";
    let redisStatus = "ok";
    let dockerStatus = "ok";
    let overallStatus: "ok" | "degraded" | "down" = "ok";

    // 1. Database Check
    try {
        await (db as any).execute(sql`SELECT 1`);
    } catch (err) {
        dbStatus = "error";
        overallStatus = "down";
    }

    // 2. Redis Check
    try {
        const pong = await redis.ping();
        if (pong !== "PONG") redisStatus = "degraded";
    } catch (err) {
        redisStatus = "error";
        if (overallStatus !== "down") overallStatus = "degraded";
    }

    // 3. Docker Check
    try {
        await (dockerManager as any).docker.ping();
    } catch (err) {
        dockerStatus = "error";
        if (overallStatus === "ok") overallStatus = "degraded";
    }

    return { overallStatus, dbStatus, redisStatus, dockerStatus };
}
