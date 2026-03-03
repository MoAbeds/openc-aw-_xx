import Stripe from "stripe";
import { Resend } from "resend";
import { env } from "../lib/env.js";
import { db } from "../db/index.js";
import { workspaces } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { emailQueue } from "../queues/index.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2024-04-10" as any,
});

const resend = new Resend(env.RESEND_API_KEY);

export const PLANS = {
    free: { id: "free", name: "Free", agents: 2, price: 0, priceId: null },
    pro: { id: "pro", name: "Professional", agents: 10, price: 97, priceId: "price_pro_id" },
    enterprise: { id: "enterprise", name: "Enterprise", agents: 999, price: 297, priceId: "price_ent_id" },
};

export class StripeService {
    async createCheckout(workspaceId: string, planId: keyof typeof PLANS, customerEmail: string) {
        const plan = PLANS[planId];
        if (!plan.priceId) throw new Error("Free plan does not require checkout");

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{ price: plan.priceId, quantity: 1 }],
            mode: "subscription",
            success_url: `${env.CORS_ORIGIN}/dashboard/billing?success=true`,
            cancel_url: `${env.CORS_ORIGIN}/dashboard/billing?canceled=true`,
            customer_email: customerEmail,
            metadata: { workspaceId, planId },
        });

        return session.url;
    }

    async createPortal(stripeCustomerId: string) {
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${env.CORS_ORIGIN}/dashboard/billing`,
        });
        return session.url;
    }

    async handleWebhook(body: any, signature: string) {
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                env.STRIPE_WEBHOOK_SECRET || ""
            );
        } catch (err: any) {
            throw new Error(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const workspaceId = session.metadata?.workspaceId;
                const planId = session.metadata?.planId as any;

                if (workspaceId && session.customer) {
                    await (db as any).update(workspaces)
                        .set({
                            plan: planId,
                            stripeCustomerId: session.customer as string,
                            stripeSubscriptionId: session.subscription as string
                        })
                        .where(eq(workspaces.id, workspaceId));

                    await this.sendWelcomeEmail(session.customer_email || "");
                }
                break;
            }
            case "customer.subscription.deleted": {
                const sub = event.data.object as Stripe.Subscription;
                await (db as any).update(workspaces)
                    .set({ plan: "free" })
                    .where(eq(workspaces.stripeSubscriptionId, sub.id));
                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.customer_email) {
                    await emailQueue.add("payment_failed", {
                        to: invoice.customer_email,
                        subject: "Urgent: Billing Protocol Error",
                        templateId: "paymentFailed",
                        props: { amount: `$${(invoice.amount_due / 100).toFixed(2)}`, retryDate: "Next 24-48 hours" }
                    });
                }
                break;
            }
            // Handle other states as needed
        }
    }

    async sendWelcomeEmail(email: string) {
        if (!env.RESEND_API_KEY) return;
        try {
            await resend.emails.send({
                from: "APEX OS <onboarding@apexos.ai>",
                to: email,
                subject: "Welcome to the Elite Fleet",
                html: "<h1>Welcome to APEX OS</h1><p>Your workspace has been upgraded. Start building your agent fleet now.</p>",
            });
        } catch (err) {
            console.error("Email delivery failure", err);
        }
    }
}

export const stripeService = new StripeService();
