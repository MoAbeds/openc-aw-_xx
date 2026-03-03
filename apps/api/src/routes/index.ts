import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes } from "./auth.js";
import { agentRoutes } from "./agents.js";
import { wsRoutes } from "./ws.js";
import { queueRoutes } from "./queues.js";
import { workspaceRoutes } from "./workspaces.js";
import { portalRoutes } from "./portal.js";
import { workflowRoutes } from "./workflows.js";
import { billingRoutes } from "./billing.js";
import { internalAgentRoutes } from "./internal.js";

/**
 * Central route registry — import and register all route modules here.
 * Each module should export a FastifyPluginAsync.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
    // ── Unprotected ──────────────────────────────────────────────────────────
    await app.register(healthRoutes, { prefix: "/api" });
    await app.register(portalRoutes, { prefix: "/api/portal" });
    await app.register(internalAgentRoutes, { prefix: "/api/internal" });

    // ── Auth ─────────────────────────────────────────────────────────────────
    await app.register(authRoutes, { prefix: "/api/auth" });

    // ── Protected (add as you build): ──────────────────────────────────────
    await app.register(agentRoutes, { prefix: "/api/agents" });
    await app.register(wsRoutes, { prefix: "/ws" });
    await app.register(queueRoutes, { prefix: "/api/queues" });
    await app.register(workspaceRoutes, { prefix: "/api/workspaces" });
    await app.register(workflowRoutes, { prefix: "/api/workflows" });
    await app.register(billingRoutes, { prefix: "/api/billing" });
}
