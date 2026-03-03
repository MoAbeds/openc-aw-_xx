import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requestContext } from "@fastify/request-context";
import { PrometheusService } from "../services/PrometheusService.js";

declare module "@fastify/request-context" {
    interface RequestContextData {
        userId?: string;
        workspaceId?: string;
        traceId: string;
    }
}

export function registerLoggingHooks(app: FastifyInstance) {
    // 1. Trace ID & Context Injection
    app.addHook("onRequest", async (req, reply) => {
        const traceId = req.id as string;
        requestContext.set("traceId", traceId);
    });

    // 2. Auth context for logging if user is authenticated
    app.addHook("preHandler", async (req, reply) => {
        if (req.user) {
            requestContext.set("userId", req.user.userId);
            requestContext.set("workspaceId", req.user.workspaceId || undefined);
        }
    });

    // 3. Metrics Tracking
    app.addHook("onReady", async () => {
        // Clear all metrics on start if needed (not usually wanted in prod)
    });

    app.addHook("onResponse", async (req, reply) => {
        const { method, url } = req;
        const { statusCode } = reply;

        // Record for Prometheus
        PrometheusService.recordApiRequest(method, url, statusCode);

        // Structured Log
        req.log.info({
            level: "info",
            time: new Date().toISOString(),
            traceId: requestContext.get("traceId"),
            userId: requestContext.get("userId"),
            workspaceId: requestContext.get("workspaceId"),
            action: `${method} ${url}`,
            meta: {
                statusCode,
                responseTime: reply.elapsedTime,
            }
        }, "API_REQUEST_COMPLETED");
    });
}
