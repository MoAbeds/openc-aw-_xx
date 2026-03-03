import type { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { agents, workspaces, agentLogs } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { redis, redisSub } from "../lib/redis.js";

export const wsRoutes: FastifyPluginAsync = async (app) => {
    // Shared authentication helper for WS connections (which don't use Authorization header easily)
    const authenticateWs = async (token: string | undefined) => {
        if (!token) throw new Error("Missing token");
        try {
            const decoded = app.jwt.verify<{ userId: string; workspaceId: string | null; role: string }>(token);
            return decoded;
        } catch (err) {
            throw new Error("Invalid token");
        }
    };

    // ── WS /ws/logs/:agentId ────────────────────────────────────────────────
    app.get("/logs/:agentId", { websocket: true }, async (socket, req) => {
        const { agentId } = req.params as { agentId: string };
        const { token } = req.query as { token?: string };

        try {
            const user = await authenticateWs(token);
            if (!user.workspaceId) {
                socket.send(JSON.stringify({ error: "No workspace" }));
                socket.close();
                return;
            }

            // Verify access to agent
            const agent = await db.query.agents.findFirst({
                where: and(eq(agents.id, agentId), eq(agents.workspaceId, user.workspaceId)),
            });

            if (!agent) {
                socket.send(JSON.stringify({ error: "Agent not found" }));
                socket.close();
                return;
            }

            // 1. Send last 50 logs from DB
            const initialLogs = await db.query.agentLogs.findMany({
                where: eq(agentLogs.agentId, agentId),
                orderBy: [desc(agentLogs.createdAt)],
                limit: 50,
            });

            // Reverse to send oldest first to match natural streaming order
            for (const log of initialLogs.reverse()) {
                socket.send(JSON.stringify(log));
            }

            // 2. Subscribe to Redis pub/sub channel
            const channel = `agent:logs:${agentId}`;

            // To handle multiple concurrent subscriptions on the same redisSub instance cleanly,
            // we attach a listener. (Alternative: instantiate a new Redis client per socket, but that blows up connections).
            const messageHandler = (ch: string, message: string) => {
                if (ch === channel && socket.readyState === socket.OPEN) { // WebSocket.OPEN is 1
                    socket.send(message);
                }
            };

            await redisSub.subscribe(channel);
            redisSub.on("message", messageHandler);

            // 3. Cleanup on disconnect
            socket.on("close", () => {
                redisSub.off("message", messageHandler);
                // We only unsubscribe if no other listeners are caring about this channel (simplified here)
                // In production with high concurrency, consider a reference counter or unique sub clients.
                // redisSub.unsubscribe(channel); 
            });

        } catch (err) {
            socket.send(JSON.stringify({ error: "Authentication failed" }));
            socket.close();
        }
    });

    // ── WS /ws/fleet ────────────────────────────────────────────────────────
    app.get("/fleet", { websocket: true }, async (socket, req) => {
        const { token } = req.query as { token?: string };

        try {
            const user = await authenticateWs(token);
            if (!user.workspaceId) {
                socket.send(JSON.stringify({ error: "No workspace" }));
                socket.close();
                return;
            }

            const workspaceId = user.workspaceId;
            const channel = `workspace:fleet:${workspaceId}`;

            // 1. Subscribe to push events (status changes, task completions)
            const messageHandler = (ch: string, message: string) => {
                if (ch === channel && socket.readyState === socket.OPEN) {
                    socket.send(message);
                }
            };

            await redisSub.subscribe(channel);
            redisSub.on("message", messageHandler);

            // 2. Emit heartbeat every 10s with all agent statuses
            const sendHeartbeat = async () => {
                if (socket.readyState !== socket.OPEN) return;

                try {
                    const allAgents = await db.query.agents.findMany({
                        where: eq(agents.workspaceId, workspaceId),
                        columns: { id: true, status: true, name: true } // minimize payload
                    });

                    socket.send(JSON.stringify({ type: "heartbeat", data: allAgents }));
                } catch (e) {
                    console.error("Heartbeat error", e);
                }
            };

            // Send immediate initial sync
            await sendHeartbeat();
            const interval = setInterval(sendHeartbeat, 10000);

            // 3. Cleanup
            socket.on("close", () => {
                clearInterval(interval);
                redisSub.off("message", messageHandler);
            });

        } catch (err) {
            socket.send(JSON.stringify({ error: "Authentication failed" }));
            socket.close();
        }
    });
};
