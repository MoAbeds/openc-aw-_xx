import fp from "fastify-plugin";
import sensible from "@fastify/sensible";
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";

export default fp(async (app: FastifyInstance) => {
    // @fastify/sensible adds app.httpErrors.* helpers + assert support
    await app.register(sensible);

    /**
     * Global error handler — normalises ALL errors to:
     *   { statusCode, error, message }
     *
     * Handles:
     *  - Fastify validation errors (400)
     *  - JWT errors (401)
     *  - App-thrown HttpErrors from @fastify/sensible
     *  - Zod errors surfaced as validation failures
     *  - Unknown 500s (message hidden in production)
     */
    app.setErrorHandler(
        (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
            const isProd = process.env.NODE_ENV === "production";

            // Log all 5xx errors as errors; 4xx as warnings
            const statusCode = error.statusCode ?? 500;
            if (statusCode >= 500) {
                request.log.error({ err: error }, "Internal server error");
            } else {
                request.log.warn({ err: error }, "Request error");
            }

            // Fastify validation error (Zod / JSON schema)
            if (error.validation) {
                return reply.code(400).send({
                    statusCode: 400,
                    error: "Bad Request",
                    message: error.message,
                    validation: error.validation,
                });
            }

            return reply.code(statusCode).send({
                statusCode,
                error: error.name ?? "Error",
                // Hide internal error details in prod for 5xx
                message:
                    statusCode >= 500 && isProd
                        ? "An internal server error occurred"
                        : error.message,
            });
        }
    );

    // 404 handler
    app.setNotFoundHandler((request, reply) => {
        request.log.warn({ url: request.url }, "Route not found");
        reply.code(404).send({
            statusCode: 404,
            error: "Not Found",
            message: `Route ${request.method} ${request.url} not found`,
        });
    });
});
