import type { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { agents, agentTasks, workspaces } from "../db/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import crypto from "crypto";

export const portalRoutes: FastifyPluginAsync = async (app) => {

    // ── Middleware: Verify Portal JWT ───────────────────────────────────
    const authenticatePortal = async (request: any, reply: any) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.code(401).send({ error: "Missing Portal Token" });
        }

        const token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, env.PORTAL_JWT_SECRET) as { workspaceId: string; slug: string };
            request.portal = decoded;
        } catch (err) {
            return reply.code(401).send({ error: "Invalid Portal Token" });
        }
    };

    // ── Public: Get Branding Info by Slug ───────────────────────────────
    app.get("/config/:slug", async (req, reply) => {
        const { slug } = req.params as { slug: string };
        const [workspace] = await (db as any).select({
            companyName: workspaces.companyName,
            logoUrl: workspaces.logoUrl,
            primaryColor: workspaces.primaryColor,
            name: workspaces.name
        })
            .from(workspaces)
            .where(eq(workspaces.slug, slug));

        if (!workspace) return reply.code(404).send({ error: "Portal not found" });
        return reply.send({ data: workspace });
    });

    // ── Protected Portal Routes ─────────────────────────────────────────

    app.get("/agents", { preHandler: [authenticatePortal] }, async (req: any, reply) => {
        const { workspaceId } = req.portal;

        const clientAgents = await db.query.agents.findMany({
            where: eq(agents.workspaceId, workspaceId),
            orderBy: [desc(agents.createdAt)],
        });

        const sanitized = clientAgents.map(a => ({
            id: a.id,
            name: a.name,
            role: a.role,
            status: a.status,
            avatar: a.avatar,
            color: a.color,
            updatedAt: a.updatedAt
        }));

        return reply.send({ data: sanitized });
    });

    app.get("/usage", { preHandler: [authenticatePortal] }, async (req: any, reply) => {
        const { workspaceId } = req.portal;

        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        firstOfMonth.setHours(0, 0, 0, 0);

        const [result] = await (db as any).select({
            count: sql`count(*)`
        })
            .from(agentTasks)
            .where(
                and(
                    eq(agentTasks.workspaceId, workspaceId),
                    sql`${agentTasks.createdAt} >= ${firstOfMonth.toISOString()}`
                )
            );

        return reply.send({
            data: {
                tasksThisMonth: Number((result as any).count || 0),
                billingPeriod: "Monthly"
            }
        });
    });

    app.post("/message", { preHandler: [authenticatePortal] }, async (req: any, reply) => {
        const { workspaceId } = req.portal;
        const { agentId, message } = req.body as { agentId: string; message: string };

        const agent = await db.query.agents.findFirst({
            where: and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId))
        });

        if (!agent) return reply.code(404).send({ error: "Agent not found" });

        const taskId = crypto.randomUUID();
        await (db as any).insert(agentTasks).values({
            id: taskId,
            workspaceId,
            agentId,
            type: "portal_message",
            payload: { message },
            status: "pending"
        });

        return reply.send({ success: true, taskId });
    });
};
