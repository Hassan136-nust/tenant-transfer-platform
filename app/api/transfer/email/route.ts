import { NextResponse } from "next/server";
import { pool } from "../../../lib/db";
import { verifySession } from "../../../lib/auth";
import { sendEmail, getTransferEmailTemplate } from "../../../lib/email";

async function getAuthenticatedSession(request: Request) {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
        cookieHeader.split(";").map((cookie) => {
            const [key, ...val] = cookie.trim().split("=");
            return [key, decodeURIComponent(val.join("="))];
        })
    );

    const token = cookies.session;
    if (!token) return null;

    return verifySession(token);
}

export async function POST(request: Request) {
    try {
        const session = await getAuthenticatedSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: "Access denied. Unauthorized session." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { recipientOrgId, message, rowCount, transferMode } = body;

        if (!recipientOrgId) {
            return NextResponse.json(
                { success: false, error: "Recipient organization ID is required." },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        try {
            // Resolve recipient organization properties
            const recipientResult = await client.query(
                `SELECT name, email FROM organizations WHERE id = $1`,
                [recipientOrgId]
            );

            if (recipientResult.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: "Recipient organization could not be found." },
                    { status: 404 }
                );
            }

            const recipient = recipientResult.rows[0];

            // Always resolve actual contact emails from .env.local or fallback to DB-registered emails
            const alphaOrgId = process.env.ALPHA_ORG_ID || "org-a";
            const betaOrgId = process.env.BETA_ORG_ID || "org-b";

            const recipientEmail = recipientOrgId === alphaOrgId
                ? (process.env.ALPHA_EMAIL || recipient.email)
                : recipientOrgId === betaOrgId
                    ? (process.env.BETA_EMAIL || recipient.email)
                    : recipient.email;

            // Generate clean message
            const cleanMessage = message ? message.trim() : "No message provided.";

            // Dynamic SMTP friendly from display name and reply-to configuration
            const emailTemplate = getTransferEmailTemplate(session.orgName, cleanMessage, rowCount, transferMode, session.email);

            console.log(`[Transfer Email API] Connecting to SMTP server to email ${recipientEmail}...`);
            await sendEmail({
                to: recipientEmail,
                subject: emailTemplate.subject,
                text: emailTemplate.text,
                html: emailTemplate.html,
                fromName: `${session.orgName} via Platform`,
                replyTo: session.email,
            });

            console.log(`[Transfer Email API] 📧 Email delivered successfully to ${recipientEmail}`);
            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (err: any) {
        console.error("[Transfer Email API] ❌ Email transmission failed:", err);
        return NextResponse.json(
            { success: false, error: err.message || "Failed to transmit notification email." },
            { status: 500 }
        );
    }
}
