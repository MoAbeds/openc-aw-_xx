import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export default fp(async (app: FastifyInstance) => {
    await app.register(swagger, {
        openapi: {
            openapi: "3.0.3",
            info: {
                title: "Apex OS API",
                description: "REST + WebSocket API for Apex OS",
                version: process.env.npm_package_version ?? "0.0.1",
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                },
            },
            tags: [
                { name: "System", description: "Health and status endpoints" },
                { name: "Auth", description: "Authentication endpoints" },
                { name: "Agents", description: "Agent management" },
            ],
        },
    });

    await app.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
            docExpansion: "list",
            deepLinking: true,
        },
        staticCSP: false,
    });
});
