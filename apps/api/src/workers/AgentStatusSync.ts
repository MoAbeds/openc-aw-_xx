import { db } from "../db/index.js";
import { agents, agentLogs, agentTasks } from "../db/schema.js";
import { dockerManager } from "../services/DockerManager.js";
import { redis } from "../lib/redis.js";
import { eq, inArray, sql } from "drizzle-orm";
import crypto from "crypto";
import axios from "axios";

export class AgentStatusSync {
    private interval: NodeJS.Timeout | null = null;
    private healthCheckFailures: Map<string, number> = new Map();

    /**
     * Starts the synchronization and health check loops
     */
    start() {
        if (this.interval) return;

        console.log("🚀 Starting AgentStatusSync worker (10s intervals)...");
        this.interval = setInterval(() => {
            this.syncStatuses().catch(err => console.error("Error in syncStatuses:", err));
            this.checkHealth().catch(err => console.error("Error in checkHealth:", err));
        }, 10000);
    }

    /**
     * Stops the worker
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * 1. Compares Docker container states with DB states
     * 2. Handles exited containers (error logs)
     */
    private async syncStatuses() {
        const containers = await dockerManager.listAgentContainers();
        const dbAgents = await (db as any).select().from(agents).where(sql`${agents.status} != 'deleted'`);

        const containerMap = new Map(containers.map((c: any) => [c.Labels["apex.agentId"], c]));

        for (const agent of dbAgents) {
            const container = containerMap.get(agent.id);
            let realStatus = "idle";

            if (container) {
                const state = container.State; // running, exited, etc.
                if (state === "running") {
                    realStatus = "active";
                } else if (state === "exited") {
                    realStatus = "idle";

                    // Handle non-zero exit code as error
                    // listContainers doesn't give exit code, we need inspect
                    const status = await dockerManager.getContainerStatus(agent.id);
                    // getContainerStatus returns { state, status, ... }
                    // Let's refine DockerManager later if needed, but for now:
                    if (status.state === "exited") {
                        // We might need to fetch the full inspect data for exit code
                        // But if it's exited and we expected it to be active, it's an issue
                    }
                }
            }

            // Update if mismatch
            if (agent.status !== realStatus && realStatus !== "deleted") {
                console.log(`[StatusSync] Agent ${agent.id} mismatch: DB(${agent.status}) != Docker(${realStatus}). Updating...`);

                await (db as any).update(agents)
                    .set({ status: realStatus, updatedAt: new Date().toISOString() })
                    .where(eq(agents.id, agent.id));

                this.publishStatus(agent.id, realStatus);
            }
        }

        // Handle specifically exited containers with error logs
        for (const container of containers) {
            const agentId = container.Labels["apex.agentId"];
            if (container.State === "exited") {
                // If we haven't logged this error yet, or it's a new crash
                // This is a simplified check. In a real app we'd track "last_logged_crash"
                // For now, if Status is 'exited' and we see non-zero (mock check as list doesn't show code)
                // We'll just check if DB says 'active' but it's exited.
                const agent = dbAgents.find((a: any) => a.id === agentId);
                if (agent && agent.status === "active") {
                    await this.handleAgentCrash(agentId);
                }
            }
        }
    }

    private async handleAgentCrash(agentId: string) {
        console.warn(`[StatusSync] Agent ${agentId} crashed (exited). Capturing logs...`);

        let capturedLogs = "";
        await dockerManager.streamLogs(agentId, (line) => {
            // This is meant for tail. streamLogs in DockerManager uses logs({ tail: 10 })
            // We'll just grab a snapshot
            capturedLogs += line + "\n";
        });

        // Wait a bit for log capture
        await new Promise(res => setTimeout(res, 2000));

        await (db as any).insert(agentLogs).values({
            id: crypto.randomUUID(),
            agentId,
            level: "error",
            message: `Agent container exited unexpectedly. Last logs:\n${capturedLogs.slice(-1000)}`,
            createdAt: new Date().toISOString()
        });

        await (db as any).update(agents)
            .set({ status: "idle", updatedAt: new Date().toISOString() })
            .where(eq(agents.id, agentId));

        this.publishStatus(agentId, "idle");
    }

    /**
     * Pings each 'active' agent's API and records latency
     */
    private async checkHealth() {
        const activeAgents = await (db as any).select().from(agents).where(eq(agents.status, "active"));

        for (const agent of activeAgents) {
            const start = Date.now();
            try {
                // OpenClaw API port 4000
                // We assume the API can reach it via 'apex-agent-<id>' or localhost if mapped
                // In a Docker network, it's apex-agent-<id>:4000
                await axios.get(`http://apex-agent-${agent.id}:4000/health`, { timeout: 3000 });
                const latency = Date.now() - start;

                // Record in agent_tasks as a "health_check" type
                await (db as any).insert(agentTasks).values({
                    id: crypto.randomUUID(),
                    agentId: agent.id,
                    type: "health_check",
                    status: "completed",
                    result: { latency_ms: latency },
                    startedAt: new Date(start).toISOString(),
                    completedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                });

                this.healthCheckFailures.delete(agent.id);
            } catch (err: any) {
                const failures = (this.healthCheckFailures.get(agent.id) || 0) + 1;
                this.healthCheckFailures.set(agent.id, failures);

                console.warn(`[HealthCheck] Agent ${agent.id} failed ping (${failures}/3): ${err.message}`);

                if (failures >= 3) {
                    await this.handleHealthFailure(agent.id);
                }
            }
        }
    }

    private async handleHealthFailure(agentId: string) {
        console.error(`[HealthCheck] Agent ${agentId} failed 3 consecutive health checks. Triggering restart...`);

        await (db as any).insert(agentLogs).values({
            id: crypto.randomUUID(),
            agentId,
            level: "error",
            message: "Node failed health checks 3 times. Restarting container...",
            createdAt: new Date().toISOString()
        });

        try {
            await dockerManager.restartAgent(agentId);
            this.healthCheckFailures.delete(agentId);
        } catch (err: any) {
            console.error(`[HealthCheck] Failed to restart agent ${agentId}:`, err.message);
            await (db as any).update(agents)
                .set({ status: "idle", updatedAt: new Date().toISOString() })
                .where(eq(agents.id, agentId));

            this.publishStatus(agentId, "idle");
        }
    }

    private publishStatus(agentId: string, status: string) {
        redis.publish("fleet:status", JSON.stringify({
            agentId,
            status,
            timestamp: new Date().toISOString()
        }));
    }
}

export const agentStatusSync = new AgentStatusSync();
export default agentStatusSync;
