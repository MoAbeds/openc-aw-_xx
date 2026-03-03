import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
    await app.register(rateLimit, {
        global: true,
        max: 100,
        timeWindow: "1 minute",
        // Use X-Forwarded-For when behind a reverse proxy / load balancer
        keyGenerator(request) {
            return (
                (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
                request.ip
            );
        },
        errorResponseBuilder(_req, context) {
            return {
                statusCode: 429,
                error: "Too Many Requests",
                message: `Rate limit exceeded. Try again in ${context.after}.`,
            };
        },
    });
});
