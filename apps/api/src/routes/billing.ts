import { FastifyInstance } from "fastify";
import { stripeService, PLANS } from "../services/StripeService.js";
import { db } from "../db/index.js";
import { workspaces, users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function billingRoutes(app: FastifyInstance) {
    // ── Webhook (Unprotected) ────────────────────────────────────────────────
    app.post("/webhook", { config: { rawBody: true } }, async (req, reply) => {
        const sig = req.headers["stripe-signature"] as string;
        if (!sig) return reply.code(400).send({ error: "Missing signature" });

        try {
            await stripeService.handleWebhook(req.body, sig);
            return reply.send({ received: true });
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    // ── Protected Routes ─────────────────────────────────────────────────────
    app.register(async (protectedApp) => {
        protectedApp.addHook("preHandler", app.authenticate);

        // Current status
        protectedApp.get("/status", async (req, reply) => {
            const workspaceId = req.user.workspaceId;
            if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

            const [ws] = await (db as any).select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
            if (!ws) return reply.code(404).send({ error: "Workspace not found" });

            const plan = PLANS[ws.plan as keyof typeof PLANS] || PLANS.free;
            return reply.send({ success: true, plan, workspace: ws });
        });

        // Checkout
        protectedApp.post("/checkout", async (req, reply) => {
            const { planId } = req.body as { planId: keyof typeof PLANS };
            const workspaceId = req.user.workspaceId;
            const userId = req.user.userId;

            if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

            const [user] = await (db as any).select().from(users).where(eq(users.id, userId)).limit(1);
            if (!user) return reply.code(404).send({ error: "User not found" });

            try {
                const url = await stripeService.createCheckout(workspaceId, planId, user.email);
                return reply.send({ success: true, url });
            } catch (err: any) {
                return reply.code(400).send({ error: err.message });
            }
        });

        // Portal
        protectedApp.get("/portal", async (req, reply) => {
            const workspaceId = req.user.workspaceId;
            if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

            const [ws] = await (db as any).select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
            if (!ws || !ws.stripeCustomerId) return reply.code(400).send({ error: "No billing profile" });

            const url = await stripeService.createPortal(ws.stripeCustomerId);
            return reply.send({ success: true, url });
        });
    });
}
