import { FastifyInstance } from "fastify";
import { workspaceService } from "../services/WorkspaceService.js";
import { nanoid } from "nanoid";
import { emailQueue } from "../queues/index.js";

export async function workspaceRoutes(app: FastifyInstance) {
    app.addHook("preHandler", app.authenticate);

    // Get all workspaces for current user
    app.get("/", async (req, reply) => {
        const userId = req.user.userId;
        const workspacesList = await workspaceService.listWorkspaces(userId);
        return reply.send({ success: true, data: workspacesList });
    });

    // Create new workspace
    app.post("/", async (req, reply) => {
        const { name } = req.body as { name: string };
        const userId = req.user.userId;

        const workspaceId = await workspaceService.createWorkspace(userId, name);
        return reply.code(201).send({ success: true, workspaceId });
    });

    // Get members of current workspace
    app.get("/members", async (req, reply) => {
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        const members = await workspaceService.getMembers(workspaceId);
        return reply.send({ success: true, data: members });
    });

    // Invite member
    app.post("/members/invite", async (req, reply) => {
        const { email, role } = req.body as { email: string; role: "admin" | "member" | "viewer" };
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        try {
            await workspaceService.inviteMember(workspaceId, email, role);

            // Fetch workspace name for email
            const workspace = await workspaceService.getWorkspace(workspaceId);

            // Trigger Email
            await emailQueue.add("invite", {
                to: email,
                subject: `You've been invited to ${workspace?.name || 'APEX OS'}`,
                templateId: "teamInvite",
                props: {
                    inviterName: "An Operator", // In a real app we'd fetch the actual name
                    workspaceName: workspace?.name,
                    inviteUrl: `https://apexos.ai/register?invite=${workspaceId}`
                }
            });

            return reply.send({ success: true, message: `Invite sent to ${email}` });
        } catch (err: any) {
            return reply.code(400).send({ success: false, error: err.message });
        }
    });

    // Update plan
    app.patch("/plan", async (req, reply) => {
        const { plan } = req.body as { plan: "free" | "pro" | "enterprise" };
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        await workspaceService.updatePlan(workspaceId, plan);
        return reply.send({ success: true, message: `Plan updated to ${plan}` });
    });

    // Update Branding
    app.patch("/branding", async (req, reply) => {
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        const branding = req.body as any;
        await workspaceService.updateBranding(workspaceId, branding);
        return reply.send({ success: true });
    });

    // Generate Portal Token
    app.get("/portal-token", async (req, reply) => {
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        const workspace = await workspaceService.getWorkspace(workspaceId);
        if (!workspace) return reply.code(404).send({ error: "Workspace not found" });

        const token = workspaceService.generatePortalToken(workspaceId, workspace.slug || workspaceId);
        return reply.send({ success: true, token });
    });
}
