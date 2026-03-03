import { db } from "../db/index.js";
import { workflows, workflowRuns, agents } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export class WorkflowService {
    async createWorkflow(workspaceId: string, name: string, steps: any[], triggerId?: string) {
        const id = nanoid();
        await (db as any).insert(workflows).values({
            id,
            workspaceId,
            name,
            steps,
            triggerId: triggerId || "manual",
        });
        return id;
    }

    async getWorkflow(id: string) {
        const [wf] = await (db as any).select().from(workflows).where(eq(workflows.id, id)).limit(1);
        return wf;
    }

    async listWorkflows(workspaceId: string) {
        return (db as any).select().from(workflows).where(eq(workflows.workspaceId, workspaceId));
    }

    async startRun(workflowId: string, workspaceId: string, initialContext: any = {}) {
        const wf = await this.getWorkflow(workflowId);
        if (!wf) throw new Error("Workflow not found");

        const runId = nanoid();
        await (db as any).insert(workflowRuns).values({
            id: runId,
            workflowId,
            workspaceId,
            status: "running",
            currentStepId: wf.steps[0]?.id,
            context: initialContext,
            startedAt: new Date().toISOString(),
        });

        // Trigger execution asynchronously
        setTimeout(() => this.runNextStep(runId), 0);

        return runId;
    }

    async getRun(runId: string) {
        const [run] = await (db as any).select().from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
        return run;
    }

    async runNextStep(runId: string) {
        const [run] = await (db as any).select().from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
        if (!run || run.status !== "running") return;

        const wf = await this.getWorkflow(run.workflowId);
        if (!wf) return;

        const currentStep = wf.steps.find((s: any) => s.id === run.currentStepId);
        if (!currentStep) {
            await (db as any).update(workflowRuns).set({ status: "completed", completedAt: new Date().toISOString() }).where(eq(workflowRuns.id, runId));
            return;
        }

        try {
            // Logic to execute the step
            const result = await this.executeStep(run.workspaceId, currentStep, run.context, wf);

            const updatedContext = { ...run.context, [currentStep.id]: result };

            // Find next step
            const currentIndex = wf.steps.findIndex((s: any) => s.id === currentStep.id);
            const nextStepId = currentStep.nextStepId || (wf.steps[currentIndex + 1]?.id);

            if (nextStepId) {
                await (db as any).update(workflowRuns).set({
                    currentStepId: nextStepId,
                    context: updatedContext,
                }).where(eq(workflowRuns.id, runId));
                // Continue execution
                setTimeout(() => this.runNextStep(runId), 1000);
            } else {
                await (db as any).update(workflowRuns).set({
                    status: "completed",
                    context: updatedContext,
                    completedAt: new Date().toISOString()
                }).where(eq(workflowRuns.id, runId));
            }
        } catch (err: any) {
            await (db as any).update(workflowRuns).set({
                status: "failed",
                error: err.message,
                completedAt: new Date().toISOString()
            }).where(eq(workflowRuns.id, runId));
        }
    }

    private async executeStep(workspaceId: string, step: any, context: any, wf: any) {
        // In a real system, we'd look for an agent and create a task.
        // For the Lead Gen built-in, we simulate the work based on step actions.

        await new Promise(r => setTimeout(r, 1000));

        switch (step.action) {
            case "LEAD_SEARCH":
                return [
                    { id: "L-1", name: "Apple", contact: "tim@apple.com", industry: step.config?.industry || "Tech" },
                    { id: "L-2", name: "Microsoft", contact: "satya@microsoft.com", industry: step.config?.industry || "Tech" },
                    { id: "L-3", name: "Google", contact: "sundar@google.com", industry: step.config?.industry || "Tech" },
                    { id: "L-4", name: "Amazon", contact: "jeff@amazon.com", industry: step.config?.industry || "Retail" },
                ];
            case "QUALIFY":
                const prevStepIdMatch = wf.steps.find((s: any) => s.action === "LEAD_SEARCH")?.id;
                const leads = context[prevStepIdMatch] || [];
                // Score leads randomly for demo
                return leads.map((l: any) => ({ ...l, score: Math.round(Math.random() * 40 + 60) }))
                    .filter((l: any) => l.score > 60);
            case "OUTREACH":
                return { sent: true, status: "Awaiting Reply" };
            case "CRM_SYNC":
                return { success: true, platform: step.config?.platform || "HubSpot" };
            default:
                return { completed: true };
        }
    }

    static getLeadGenTemplate() {
        return {
            name: "Automated Lead Generation",
            steps: [
                { id: "step_1", action: "LEAD_SEARCH", config: { industry: "SaaS", location: "Global" }, agentId: "lead_finder_agent" },
                { id: "step_2", action: "QUALIFY", config: { minScore: 60 }, agentId: "qualify_agent" },
                { id: "step_3", action: "OUTREACH", config: { template: "Initial Outreach" }, agentId: "outreach_agent" },
                { id: "step_4", action: "CRM_SYNC", config: { crm: "HubSpot" }, agentId: "crm_agent" },
            ]
        };
    }
}

export const workflowService = new WorkflowService();
