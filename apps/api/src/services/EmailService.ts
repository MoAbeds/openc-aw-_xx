import { Resend } from 'resend';
import { env } from '../lib/env.js';

const resend = new Resend(env.RESEND_API_KEY);

interface EmailTemplateProps {
    userName?: string;
    workspaceName?: string;
    agentName?: string;
    errorMessage?: string;
    agentId?: string;
    amount?: string;
    retryDate?: string;
    inviteUrl?: string;
    inviterName?: string;
    agentStats?: any[];
}

export class EmailService {
    static fromEmail = "APEX OS <alerts@apexos.ai>";

    async sendEmail(to: string, subject: string, html: string) {
        if (!env.RESEND_API_KEY) {
            console.warn("⚠️  RESEND_API_KEY not set. Skipping email delivery.");
            return;
        }

        try {
            await resend.emails.send({
                from: EmailService.fromEmail,
                to,
                subject,
                html,
            });
            console.log(`✅ Email sent to ${to}: ${subject}`);
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error);
        }
    }

    // --- Templates ---

    templates = {
        welcome: ({ userName, workspaceName }: EmailTemplateProps) => `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #1a1a1b; padding: 40px; background: #0b0b0c; color: #ffffff; border-radius: 24px;">
                <h1 style="color: #00ffd1; font-style: italic; font-weight: 800; letter-spacing: -0.05em; font-size: 32px;">WELCOME TO THE ELITE FLEET</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #a1a1aa;">Hello <b>${userName}</b>,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa;">Your intelligence workspace, <b>${workspaceName}</b>, is now operational. You can start deploying agent nodes immediately.</p>
                <div style="margin-top: 30px; border-top: 1px solid #1a1a1b; padding-top: 20px;">
                    <a href="https://apexos.ai/dashboard" style="background: #00ffd1; color: #0b0b0c; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">Initialize Operations</a>
                </div>
            </div>
        `,

        agentError: ({ agentName, errorMessage, agentId }: EmailTemplateProps) => `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #450a0a; padding: 40px; background: #0b0b0c; color: #ffffff; border-radius: 24px;">
                <h1 style="color: #f87171; font-style: italic; font-weight: 800; letter-spacing: -0.05em; font-size: 24px;">CRITICAL AGENT FAILURE</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa;">Agent Node <b>${agentName}</b> (ID: ${agentId}) has encountered consecutive terminal errors.</p>
                <div style="background: #1a1a1b; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #3f3f46;">
                    <code style="color: #fca5a5; font-size: 12px;">${errorMessage}</code>
                </div>
                <a href="https://apexos.ai/dashboard/agents/${agentId}" style="color: #00ffd1; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase;">Review Telemetry Report</a>
            </div>
        `,

        paymentFailed: ({ amount, retryDate }: EmailTemplateProps) => `
             <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #1a1a1b; padding: 40px; background: #0b0b0c; color: #ffffff; border-radius: 24px;">
                <h1 style="color: #fb923c; font-style: italic; font-weight: 800; letter-spacing: -0.05em; font-size: 24px;">TRANSACTION PROTOCOL ERROR</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa;">We were unable to process your payment of <b>${amount}</b>. Your agent seats may become restricted if this is not resolved.</p>
                <p style="font-size: 14px; color: #71717a;">The next retry logic will initialize on <b>${retryDate}</b>.</p>
                <div style="margin-top: 30px;">
                    <a href="https://apexos.ai/dashboard/billing" style="background: #fb923c; color: #0b0b0c; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">Update Payment Gateway</a>
                </div>
            </div>
        `,

        teamInvite: ({ inviterName, workspaceName, inviteUrl }: EmailTemplateProps) => `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #1a1a1b; padding: 40px; background: #0b0b0c; color: #ffffff; border-radius: 24px;">
                <h1 style="color: #a78bfa; font-style: italic; font-weight: 800; letter-spacing: -0.05em; font-size: 24px;">OPERATIVE COLLABORATION REQUEST</h1>
                <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa;"><b>${inviterName}</b> has invited you to join the fleet at <b>${workspaceName}</b>.</p>
                <div style="margin-top: 30px;">
                    <a href="${inviteUrl}" style="background: #a78bfa; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 12px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;">Accept Intelligence Invite</a>
                </div>
            </div>
        `,

        dailyDigest: ({ workspaceName, agentStats }: EmailTemplateProps) => `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #1a1a1b; padding: 40px; background: #0b0b0c; color: #ffffff; border-radius: 24px;">
                <h1 style="color: #00ffd1; font-style: italic; font-weight: 800; letter-spacing: -0.01em; font-size: 24px;">FLEET OPERATIVE DIGEST: 24H</h1>
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #71717a; margin-bottom: 30px;">Workspace: ${workspaceName}</p>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #1a1a1b;">
                            <th style="padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #71717a;">Agent Node</th>
                            <th style="padding: 10px; text-align: right; font-size: 10px; text-transform: uppercase; color: #71717a;">Tasks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${agentStats?.map(s => `
                            <tr style="border-bottom: 1px solid #1a1a1b;">
                                <td style="padding: 15px 10px; font-size: 13px;">${s.name}</td>
                                <td style="padding: 15px 10px; text-align: right; font-size: 13px; color: #00ffd1; font-weight: bold;">${s.taskCount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1b; text-align: center;">
                    <a href="https://apexos.ai/dashboard" style="font-size: 10px; text-decoration: none; color: #71717a; text-transform: uppercase; letter-spacing: 0.1em;">View All Fleet Systems</a>
                </div>
            </div>
        `
    }
}

export const emailService = new EmailService();
