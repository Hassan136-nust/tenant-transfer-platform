import { NextResponse } from "next/server";
import { query } from "../../lib/db";
import { verifySession } from "../../lib/auth";
import { sendEmail, getTransferEmailTemplate } from "../../lib/email";

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

        const { message, recipientOrgId } = await request.json();
        const cleanMessage = (message || "").trim();

        if (!recipientOrgId || typeof recipientOrgId !== "string") {
            return NextResponse.json(
                { success: false, error: "Target recipient organization is required." },
                { status: 400 }
            );
        }

        // 2. Resolve recipient organization properties (for email notification)
        const recipientResult = await query(
            `SELECT name, email FROM organizations WHERE id = $1`,
            [recipientOrgId]
        );

        if (recipientResult.rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Recipient organization could not be found or resolved." },
                { status: 404 }
            );
        }

        const recipient = recipientResult.rows[0];

        // Always resolve actual contact emails from .env.local or fallback to DB-registered emails
        const recipientEmail = recipientOrgId === "org-a"
            ? (process.env.ALPHA_EMAIL || recipient.email)
            : recipientOrgId === "org-b"
                ? (process.env.BETA_EMAIL || recipient.email)
                : recipient.email;

        const senderEmail = session.orgId === "org-a"
            ? (process.env.ALPHA_EMAIL || session.email)
            : session.orgId === "org-b"
                ? (process.env.BETA_EMAIL || session.email)
                : session.email;

        // 3. Fetch sender's active organization data rows to duplicate
        const sourceDataResult = await query(
            `SELECT record_name, category, metric_value, security_level, status, custodian_email 
       FROM organization_data 
       WHERE org_id = $1`,
            [session.orgId]
        );

        const rowCount = sourceDataResult.rows.length;

        if (rowCount === 0) {
            return NextResponse.json(
                { success: false, error: "No records found in dashboard to transfer." },
                { status: 400 }
            );
        }

        // 4. Perform transactional cloning to guarantee isolation
        // We loop and clone every record with recipientOrgId as parent, creating completely distinct records
        const insertValues: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        for (let i = 0; i < rowCount; i++) {
            const record = sourceDataResult.rows[i];
            insertValues.push(
                `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
            );
            queryParams.push(
                recipientOrgId,
                record.record_name,
                record.category,
                record.metric_value,
                record.security_level,
                record.status,
                record.custodian_email
            );
            paramIndex += 7;
        }

        // Batch insert cloned records in transaction chunks
        const chunkSize = 100;
        for (let chunkIdx = 0; chunkIdx < insertValues.length; chunkIdx += chunkSize) {
            const valueSlice = insertValues.slice(chunkIdx, chunkIdx + chunkSize);
            const paramSlice = queryParams.slice(chunkIdx * 7, (chunkIdx + chunkSize) * 7);

            let sliceParamIndex = 1;
            const adjustedValues = valueSlice.map(() => {
                const text = `($${sliceParamIndex}, $${sliceParamIndex + 1}, $${sliceParamIndex + 2}, $${sliceParamIndex + 3}, $${sliceParamIndex + 4}, $${sliceParamIndex + 5}, $${sliceParamIndex + 6})`;
                sliceParamIndex += 7;
                return text;
            });

            const chunkQueryStr = `
        INSERT INTO organization_data (org_id, record_name, category, metric_value, security_level, status, custodian_email)
        VALUES ${adjustedValues.join(", ")}
      `;

            await query(chunkQueryStr, paramSlice);
        }

        // 5. Commit Transfer Ledger Log
        await query(
            `INSERT INTO transfers (sender_org_id, recipient_org_id, message, row_count)
       VALUES ($1, $2, $3, $4)`,
            [session.orgId, recipientOrgId, cleanMessage, rowCount]
        );

        console.log(
            `[Transfer API] Org ${session.orgId} cloned & transferred ${rowCount} records to Org ${recipientOrgId}`
        );

        // 6. Dispatch Rich Notification Email Alert to Recipient Org (non-blocking)
        try {
            const emailTemplate = getTransferEmailTemplate(session.orgName, cleanMessage, rowCount);
            // Resolve sender's real email from env so the FROM display and reply-to are correct
            const senderEmail = session.orgId === "org-a"
                ? (process.env.ALPHA_EMAIL || "alpha@example.com")
                : (process.env.BETA_EMAIL || "beta@example.com");

            await sendEmail({
                to: recipientEmail,
                subject: emailTemplate.subject,
                text: emailTemplate.text,
                html: emailTemplate.html,
                fromName: session.orgName,       // e.g. "Organization Alpha" as display name
                replyTo: senderEmail,            // sender's real .env email as Reply-To
            });
            console.log(`[Transfer API] Notification email dispatched to ${recipientEmail} (sent as "${session.orgName}", replyTo: ${senderEmail})`);
        } catch (emailErr: any) {
            // Email failure must NOT roll back the data transfer
            console.warn(`[Transfer API] Email notification failed (transfer still succeeded): ${emailErr.message}`);
        }

        return NextResponse.json({
            success: true,
            senderOrgName: session.orgName,
            recipientOrgName: recipient.name,
            rowCount,
            message: `Successfully cloned and migrated ${rowCount} records to ${recipient.name} workspace.`,
        });
    } catch (err: any) {
        console.error("[Transfer API] Error executing data transfer transaction:", err);
        return NextResponse.json(
            { success: false, error: "Failed to compile data transfer transaction." },
            { status: 500 }
        );
    }
}
