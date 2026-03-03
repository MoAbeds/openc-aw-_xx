import "dotenv/config";
import { build } from "./app.js";
import { env } from "./lib/env.js";

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function start() {
    let app: Awaited<ReturnType<typeof build>> | undefined;

    try {
        app = await build();

        await app.listen({ port: env.PORT, host: env.HOST });

        // Start background workers
        const { agentStatusSync } = await import("./workers/AgentStatusSync.js");
        agentStatusSync.start();

        app.log.info(
            {
                url: `http://${env.HOST}:${env.PORT}`,
                docs: `http://${env.HOST}:${env.PORT}/docs`,
                env: env.NODE_ENV,
            },
            "🚀 apex-os API started"
        );
    } catch (err) {
        console.error("Failed to start server", err);
        process.exit(1);
    }

    // ── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
        app?.log.info({ signal }, "Shutdown signal received");
        try {
            await app?.close();

            // Cleanup workers
            const { agentStatusSync } = await import("./workers/AgentStatusSync.js");
            agentStatusSync.stop();

            // Import and run queue cleanup dynamically to avoid cyclic dependencies on boot if needed,
            // or statically. We'll just require it statically since it's safe now.
            const { closeQueuesAndWorkers } = await import("./queues/index.js");
            await closeQueuesAndWorkers();
            console.info("Server & Queues closed gracefully");
            process.exit(0);
        } catch (err) {
            console.error("Error during shutdown", err);
            process.exit(1);
        }
    };

    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));

    // Catch unhandled rejections — log and exit so the process manager restarts
    process.on("unhandledRejection", (reason) => {
        console.error("Unhandled promise rejection", reason);
        process.exit(1);
    });

    process.on("uncaughtException", (err) => {
        console.error("Uncaught exception", err);
        process.exit(1);
    });
}

start();
