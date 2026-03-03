import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../lib/env.js";

// ── Type augmentation ──────────────────────────────────────────────────────────
declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: { userId: string; workspaceId: string | null; role: "admin" | "user" };
        user: { userId: string; workspaceId: string | null; role: "admin" | "user" };
    }
}

declare module "fastify" {
    interface FastifyInstance {
        authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authenticateAdmin: (
            req: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;
    }
}

export default fp(async (app: FastifyInstance) => {
    await app.register(fastifyJwt, {
        secret: env.JWT_SECRET,
        sign: {
            expiresIn: "7d",
        },
    });

    /**
     * authenticate — verifies the Bearer token and attaches req.user.
     * Use as a preHandler on any route that requires auth.
     *
     * @example
     * { preHandler: [app.authenticate] }
     */
    app.decorate(
        "authenticate",
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                await req.jwtVerify();
            } catch (err) {
                reply.code(401).send({
                    statusCode: 401,
                    error: "Unauthorized",
                    message: "Invalid or expired token",
                });
            }
        }
    );

    /**
     * authenticateAdmin — also verifies the token is from an admin role.
     */
    app.decorate(
        "authenticateAdmin",
        async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                await req.jwtVerify();
                if (req.user.role !== "admin") {
                    return reply.code(403).send({
                        statusCode: 403,
                        error: "Forbidden",
                        message: "Admin access required",
                    });
                }
            } catch (err) {
                reply.code(401).send({
                    statusCode: 401,
                    error: "Unauthorized",
                    message: "Invalid or expired token",
                });
            }
        }
    );
});
