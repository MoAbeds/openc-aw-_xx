import "dotenv/config";
import Fastify from "fastify";
import { env } from "./lib/env.js";

// Plugins
import corsPlugin from "./plugins/cors.js";
import helmetPlugin from "./plugins/helmet.js";
import jwtPlugin from "./plugins/jwt.js";
import rateLimitPlugin from "./plugins/rateLimit.js";
import websocketPlugin from "./plugins/websocket.js";
import swaggerPlugin from "./plugins/swagger.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import { fastifyRequestContext } from "@fastify/request-context";
import { registerLoggingHooks } from "./plugins/observability.js";

// Routes
import { registerRoutes } from "./routes/index.js";

import type { FastifyInstance } from "fastify";

/**
 * build() — creates and configures the Fastify instance.
 * Kept separate from start() so the app can be imported in tests
 * without binding to a port.
 */
export async function build() {
    const isDev = env.NODE_ENV === "development";
    const app = Fastify({
        logger: {
            level: isDev ? "debug" : "info",
            ...(isDev && {
                transport: {
                    target: "pino-pretty",
                    options: {
                        colorize: true,
                        translateTime: "SYS:HH:MM:ss",
                        ignore: "pid,hostname",
                    },
                },
            }),
        } as any,
        // Trust first proxy hop (needed for rate-limit IP extraction behind nginx)
        trustProxy: true,
        // Generate request IDs for tracing
        genReqId() {
            return crypto.randomUUID();
        },
        requestIdHeader: "x-request-id",
        requestIdLogLabel: "reqId",
    });

    // ── Infrastructure plugins (order matters) ───────────────────────────────
    await app.register(fastifyRequestContext);
    registerLoggingHooks(app);

    // Error handler registers first so it catches plugin registration errors
    await app.register(errorHandlerPlugin);
    await app.register(helmetPlugin);
    await app.register(corsPlugin);
    await app.register(rateLimitPlugin);
    await app.register(jwtPlugin);
    await app.register(websocketPlugin);
    await app.register(swaggerPlugin);

    // ── Routes ───────────────────────────────────────────────────────────────
    await registerRoutes(app);

    return app;
}
