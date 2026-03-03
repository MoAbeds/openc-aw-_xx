import client from "prom-client";
import { db } from "../db/index.js";
import { agents, agentTasks } from "../db/schema.js";
import { eq, sql, count } from "drizzle-orm";
import { agentTaskQueue, agentCommandQueue, emailQueue } from "../queues/index.js";

// Create a Registry
export const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// --- Custom Metrics ---

// Agents count by status
const agentsTotal = new client.Gauge({
    name: "agents_total",
    help: "Total number of agents by status",
    labelNames: ["status"],
});

// Tasks completed total
const tasksCompletedTotal = new client.Counter({
    name: "tasks_completed_total",
    help: "Total tasks completed by agent",
    labelNames: ["agentId", "agentName"],
});

// API requests total
const apiRequestsTotal = new client.Counter({
    name: "api_requests_total",
    help: "Total API requests by route and status",
    labelNames: ["method", "route", "status"],
});

// Container restarts
export const containerRestartsTotal = new client.Counter({
    name: "container_restarts_total",
    help: "Total number of container restarts",
    labelNames: ["agentId"],
});

// Queue depth
const queueDepth = new client.Gauge({
    name: "queue_depth",
    help: "Current depth of various task queues",
    labelNames: ["queueName"],
});

// Register metrics
register.registerMetric(agentsTotal);
register.registerMetric(tasksCompletedTotal);
register.registerMetric(apiRequestsTotal);
register.registerMetric(containerRestartsTotal);
register.registerMetric(queueDepth);

export class PrometheusService {
    static async updateMetrics() {
        // 1. Update Agent counts
        const statusList = ["active", "idle", "disabled", "deleted"] as const;
        for (const status of statusList) {
            const [res] = await (db as any).select({ total: count() }).from(agents).where(eq(agents.status, status));
            agentsTotal.set({ status }, res?.total || 0);
        }

        // 2. Update Queue depths
        const [taskCount, commandCount, emailCount] = await Promise.all([
            agentTaskQueue.getWaitingCount(),
            agentCommandQueue.getWaitingCount(),
            emailQueue.getWaitingCount(),
        ]);
        queueDepth.set({ queueName: "agent-tasks" }, taskCount);
        queueDepth.set({ queueName: "agent-commands" }, commandCount);
        queueDepth.set({ queueName: "emails" }, emailCount);
    }

    static recordApiRequest(method: string, route: string, status: number) {
        apiRequestsTotal.inc({ method, route, status: status.toString() });
    }

    static recordTaskCompletion(agentId: string, agentName: string) {
        tasksCompletedTotal.inc({ agentId, agentName });
    }

    static async getMetrics() {
        await this.updateMetrics();
        return register.metrics();
    }
}
