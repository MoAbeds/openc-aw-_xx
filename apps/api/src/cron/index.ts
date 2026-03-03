import cron from "node-cron";
import { db } from "../db/index.js";
import { workspaces, agents, agentTasks } from "../db/schema.js";
import { count, eq, sql } from "drizzle-orm";
import { emailQueue } from "../queues/index.js";
import { pushNotificationService } from "../services/PushNotificationService.js";

/**
 * Initializes all system-wide cron jobs.
 */
export function initCronJobs() {
    // ── Daily Digest @ 8am ──────────────────────────────────────────────────
    cron.schedule("0 8 * * *", async () => {
        console.log("[Cron] Running Daily Digest protocol...");

        // 1. Fetch all active workspaces
        const allWorkspaces = await db.query.workspaces.findMany({
            with: { owner: true }
        });

        for (const ws of allWorkspaces) {
            if (!ws.owner.email) continue;

            // 2. Fetch stats for this workspace
            const workspaceAgents = await db.query.agents.findMany({
                where: eq(agents.workspaceId, ws.id)
            });

            const stats = [];
            for (const agent of workspaceAgents) {
                // Count tasks in last 24h
                const [{ total }] = await (db as any).select({ total: count() })
                    .from(agentTasks)
                    .where(
                        sql`${agentTasks.agentId} = ${agent.id} AND ${agentTasks.createdAt} > datetime('now', '-1 day')`
                    );

                stats.push({ name: agent.name, taskCount: total || 0 });
            }

            // 3. Queue Digest Email
            await pushNotificationService.notifyWorkspace(ws.id, {
                title: "Daily Fleet Digest",
                body: `Your fleet completed ${stats.reduce((acc, s) => acc + s.taskCount, 0)} tasks in the last 24h. Check your dashboard for details.`,
                action: "VIEW_DASHBOARD"
            });

            await emailQueue.add("daily_digest", {
                to: ws.owner.email,
                subject: `Daily Fleet Report: ${ws.name}`,
                templateId: "dailyDigest",
                props: {
                    workspaceName: ws.name,
                    agentStats: stats
                }
            });
        }
    });
}
