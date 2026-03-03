import { FastifyInstance } from "fastify";
import { workflowService, WorkflowService } from "../services/WorkflowService.js";

export async function workflowRoutes(app: FastifyInstance) {
    app.addHook("preHandler", app.authenticate);

    // List all workflows in workspace
    app.get("/", async (req, reply) => {
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        const wfs = await workflowService.listWorkflows(workspaceId);
        return reply.send({ success: true, data: wfs });
    });

    // Create a new workflow
    app.post("/", async (req, reply) => {
        const { name, steps, triggerId } = req.body as { name: string; steps: any[]; triggerId?: string };
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        const id = await workflowService.createWorkflow(workspaceId, name, steps, triggerId);
        return reply.code(201).send({ success: true, id });
    });

    // Get an individual workflow
    app.get("/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const wf = await workflowService.getWorkflow(id);
        if (!wf) return reply.code(404).send({ error: "Workflow not found" });

        return reply.send({ success: true, data: wf });
    });

    // Initialize/Start a Workflow Run
    app.post("/:id/run", async (req, reply) => {
        const { id } = req.params as { id: string };
        const { initialContext } = req.body as { initialContext?: any };
        const workspaceId = req.user.workspaceId;
        if (!workspaceId) return reply.code(400).send({ error: "No workspace" });

        try {
            const runId = await workflowService.startRun(id, workspaceId, initialContext);
            return reply.send({ success: true, runId });
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    // Monitor a Run's progress
    app.get("/runs/:runId", async (req, reply) => {
        const { runId } = req.params as { runId: string };
        const run = await workflowService.getRun(runId);
        if (!run) return reply.code(404).send({ error: "Workflow run not found" });

        return reply.send({ success: true, data: run });
    });

    // Utility: Fetch Lead-Gen Template for builder
    app.get("/templates/lead-gen", async (req, reply) => {
        const data = WorkflowService.getLeadGenTemplate();
        return reply.send({ success: true, data });
    });
}
