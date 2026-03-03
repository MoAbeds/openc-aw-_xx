import { z } from "zod";
import type { FastifyPluginAsync } from "fastify";
import type { HealthStatus } from "@apex-os/types";

const startTime = Date.now();

// Response schema for Zod + OpenAPI derivation
const healthResponseSchema = z.object({
    status: z.enum(["ok", "degraded", "down"]),
    version: z.string(),
    uptime: z.number(),
    timestamp: z.string(),
});

export const healthRoutes: FastifyPluginAsync = async (app) => {
    app.get<{ Reply: HealthStatus }>(
        "/health",
        {
            schema: {
                description: "Service health check",
                tags: ["System"],
                response: {
                    200: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["ok", "degraded", "down"],
                            },
                            version: { type: "string" },
                            uptime: { type: "number", description: "Uptime in seconds" },
                            timestamp: { type: "string", format: "date-time" },
                        },
                        required: ["status", "version", "uptime", "timestamp"],
                    },
                },
            },
        },
        async (_request, reply) => {
            const payload = healthResponseSchema.parse({
                status: "ok",
                version: process.env.npm_package_version ?? "0.0.1",
                uptime: Math.floor((Date.now() - startTime) / 1000),
                timestamp: new Date().toISOString(),
            } satisfies HealthStatus);

            return reply.code(200).send(payload);
        }
    );
};
