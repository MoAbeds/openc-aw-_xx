import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db/index.js";
import { users, workspaces, sessions } from "../db/schema.js";
import { eq } from "drizzle-orm";

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
    // ── POST /auth/register ───────────────────────────────────────────────────
    app.post(
        "/register",
        {
            schema: {
                description: "Register a new user and create a default workspace",
                tags: ["Auth"],
                body: {
                    type: "object",
                    required: ["email", "password", "name"],
                    properties: {
                        email: { type: "string", format: "email" },
                        password: { type: "string", minLength: 8 },
                        name: { type: "string", minLength: 2 },
                    },
                },
            },
        },
        async (request, reply) => {
            const { email, password, name } = registerSchema.parse(request.body);

            // 1. Check if user already exists
            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (existingUser) {
                return reply.code(409).send({
                    statusCode: 409,
                    error: "Conflict",
                    message: "User with this email already exists",
                });
            }

            // 2. Hash password
            const passwordHash = await bcrypt.hash(password, 12);
            const userId = crypto.randomUUID();
            const workspaceId = crypto.randomUUID();

            // 3. Create User & Default Workspace (in a transaction)
            await (db as any).transaction(async (tx: any) => {
                await tx.insert(users).values({
                    id: userId,
                    email,
                    name,
                    passwordHash,
                    role: "admin", // First user or default role? Making them admin of their own workspace anyway
                });

                await tx.insert(workspaces).values({
                    id: workspaceId,
                    name: `${name}'s Workspace`,
                    ownerId: userId,
                    plan: "free",
                });
            });

            // 4. Generate JWT
            const token = app.jwt.sign({
                userId,
                workspaceId,
                role: "admin",
            });

            // 5. Store session in DB
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            await (db as any).insert(sessions).values({
                id: crypto.randomUUID(),
                userId,
                token,
                expiresAt,
            });

            return reply.code(201).send({
                token,
                user: { id: userId, email, name, role: "admin" },
                workspace: { id: workspaceId, name: `${name}'s Workspace`, plan: "free" },
            });
        }
    );

    // ── POST /auth/login ──────────────────────────────────────────────────────
    app.post(
        "/login",
        {
            schema: {
                description: "Login and receive a JWT",
                tags: ["Auth"],
                body: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email" },
                        password: { type: "string", minLength: 8 },
                    },
                },
            },
        },
        async (request, reply) => {
            const { email, password } = loginSchema.parse(request.body);

            // 1. Find User
            const user = await db.query.users.findFirst({
                where: eq(users.email, email),
                with: { workspaces: true },
            });

            if (!user) {
                return reply.code(401).send({
                    statusCode: 401,
                    error: "Unauthorized",
                    message: "Invalid email or password",
                });
            }

            // 2. Verify Password
            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                return reply.code(401).send({
                    statusCode: 401,
                    error: "Unauthorized",
                    message: "Invalid email or password",
                });
            }

            // Grab their first workspace (if they have one)
            const primaryWorkspace = user.workspaces[0];
            const workspaceId = primaryWorkspace ? primaryWorkspace.id : null;

            // 3. Generate JWT
            const token = app.jwt.sign({
                userId: user.id,
                workspaceId,
                role: user.role,
            });

            // 4. Store Session
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await (db as any).insert(sessions).values({
                id: crypto.randomUUID(),
                userId: user.id,
                token,
                expiresAt,
            });

            return reply.code(200).send({
                token,
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
                workspace: primaryWorkspace
                    ? { id: primaryWorkspace.id, name: primaryWorkspace.name, plan: primaryWorkspace.plan }
                    : null,
            });
        }
    );

    // ── GET /auth/me ──────────────────────────────────────────────────────────
    app.get(
        "/me",
        {
            preHandler: [app.authenticate],
            schema: {
                description: "Get current user profile and active workspace",
                tags: ["Auth"],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            const { userId, workspaceId } = request.user;

            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                return reply.code(404).send({
                    statusCode: 404,
                    error: "Not Found",
                    message: "User not found",
                });
            }

            let activeWorkspace = null;
            if (workspaceId) {
                activeWorkspace = await db.query.workspaces.findFirst({
                    where: eq(workspaces.id, workspaceId),
                });
            }

            return reply.code(200).send({
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
                workspace: activeWorkspace
                    ? { id: activeWorkspace.id, name: activeWorkspace.name, plan: activeWorkspace.plan }
                    : null,
            });
        }
    );

    // ── POST /auth/logout ─────────────────────────────────────────────────────
    app.post(
        "/logout",
        {
            preHandler: [app.authenticate],
            schema: {
                description: "Logout and invalidate session",
                tags: ["Auth"],
                security: [{ bearerAuth: [] }],
            },
        },
        async (request, reply) => {
            // Extract the bare token from the header for session invalidation
            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                const token = authHeader.substring(7);
                await (db as any).delete(sessions).where(eq(sessions.token, token));
            }

            return reply.code(200).send({ success: true });
        }
    );
};
