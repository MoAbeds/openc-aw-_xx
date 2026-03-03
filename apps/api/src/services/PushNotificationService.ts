import webpush from "web-push";
import { db } from "../db/index.js";
import { pushSubscriptions, workspaceMembers } from "../db/schema.js";
import { eq, and, inArray } from "drizzle-orm";

class PushNotificationService {
    constructor() {
        const publicK = process.env.VAPID_PUBLIC_KEY;
        const privateK = process.env.VAPID_PRIVATE_KEY;
        const email = process.env.VAPID_EMAIL || "mailto:ops@apex-os.ai";

        if (publicK && privateK) {
            webpush.setVapidDetails(email, publicK, privateK);
        } else {
            console.warn("⚠️ VAPID keys not configured. Push Notifications disabled.");
        }
    }

    async saveSubscription(userId: string, subscription: any) {
        await (db as any).insert(pushSubscriptions).values({
            id: crypto.randomUUID(),
            userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        }).onConflictDoUpdate({
            target: pushSubscriptions.endpoint,
            set: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            }
        });
    }

    async notifyWorkspace(workspaceId: string, payload: { title: string, body: string, agentId?: string, action?: string }) {
        // 1. Get all members of the workspace
        const members = await db.query.workspaceMembers.findMany({
            where: eq(workspaceMembers.workspaceId, workspaceId)
        });
        const userIds = members.map(m => m.userId);

        // 2. Get subscriptions for these users
        const subs = await db.query.pushSubscriptions.findMany({
            where: inArray(pushSubscriptions.userId, userIds)
        });

        // 3. Send
        const promises = subs.map(sub => {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            return webpush.sendNotification(pushConfig, JSON.stringify(payload))
                .catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Sub expired or gone
                        return (db as any).delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
                    }
                    console.error("Push Error:", err);
                });
        });

        await Promise.all(promises);
    }
}

export const pushNotificationService = new PushNotificationService();
