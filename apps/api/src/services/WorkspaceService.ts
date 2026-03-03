import { db } from "../db/index.js";
import { workspaces, workspaceMembers, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { env } from "../lib/env.js";
import jwt from "jsonwebtoken";

export class WorkspaceService {
    async createWorkspace(userId: string, name: string) {
        const workspaceId = nanoid();

        await (db as any).transaction(async (tx: any) => {
            // Create workspace
            await tx.insert(workspaces).values({
                id: workspaceId,
                name,
                ownerId: userId,
                plan: "free",
            });

            // Add user as owner in workspace_members
            await tx.insert(workspaceMembers).values({
                id: nanoid(),
                workspaceId,
                userId,
                role: "owner",
            });
        });

        return workspaceId;
    }

    async inviteMember(workspaceId: string, email: string, role: "owner" | "admin" | "member" | "viewer" = "member") {
        // Find user by email
        const [user] = await (db as any).select().from(users).where(eq(users.email, email));
        if (!user) {
            throw new Error(`User with email ${email} not found`);
        }

        // Check if already a member
        const [existing] = await (db as any).select().from(workspaceMembers).where(
            and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.userId, user.id)
            )
        );

        if (existing) {
            throw new Error("User is already a member of this workspace");
        }

        await (db as any).insert(workspaceMembers).values({
            id: nanoid(),
            workspaceId,
            userId: user.id,
            role,
        });

        return true;
    }

    async getMembers(workspaceId: string) {
        return (db as any).select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: workspaceMembers.role,
            joinedAt: workspaceMembers.createdAt
        })
            .from(workspaceMembers)
            .innerJoin(users, eq(workspaceMembers.userId, users.id))
            .where(eq(workspaceMembers.workspaceId, workspaceId));
    }

    async updatePlan(workspaceId: string, plan: "free" | "pro" | "enterprise") {
        await (db as any).update(workspaces).set({ plan }).where(eq(workspaces.id, workspaceId));
    }

    async getWorkspace(workspaceId: string) {
        const [ws] = await (db as any).select().from(workspaces).where(eq(workspaces.id, workspaceId));
        return ws;
    }

    async listWorkspaces(userId: string) {
        return (db as any).select({
            id: workspaces.id,
            name: workspaces.name,
            plan: workspaces.plan,
            role: workspaceMembers.role,
        })
            .from(workspaceMembers)
            .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
            .where(eq(workspaceMembers.userId, userId));
    }

    async updateBranding(workspaceId: string, branding: any) {
        await (db as any).update(workspaces).set(branding).where(eq(workspaces.id, workspaceId));
    }

    generatePortalToken(workspaceId: string, slug: string) {
        return jwt.sign({ workspaceId, slug }, env.PORTAL_JWT_SECRET, { expiresIn: "30d" });
    }
}

export const workspaceService = new WorkspaceService();
