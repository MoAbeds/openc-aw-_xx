import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { agents } from "../db/schema.js";
import { count, eq } from "drizzle-orm";
import { workspaceService } from "../services/WorkspaceService.js";

const LIMITS = {
    free: { agents: 2, workspaces: 1 },
    pro: { agents: 10, workspaces: 3 },
    enterprise: { agents: Infinity, workspaces: Infinity },
};

export async function checkAgentLimit(req: FastifyRequest, reply: FastifyReply) {
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
        return reply.code(400).send({
            statusCode: 400,
            error: "Bad Request",
            message: "No workspace selected in session"
        });
    }

    const workspace = await workspaceService.getWorkspace(workspaceId);
    const plan = workspace?.plan || "free";
    const limit = LIMITS[plan as keyof typeof LIMITS].agents;

    const [res] = await (db as any).select({ total: count() }).from(agents).where(eq(agents.workspaceId, workspaceId));
    const currentCount = res?.total || 0;

    if (currentCount >= limit) {
        return reply.code(403).send({
            statusCode: 403,
            error: "Forbidden",
            message: `Your ${plan} plan is limited to ${limit} agents. Upgrade to add more.`,
        });
    }
}
