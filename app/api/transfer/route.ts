import { NextResponse } from "next/server";
import { query, pool } from "../../lib/db";
import { verifySession } from "../../lib/auth";
import { sendEmail, getTransferEmailTemplate } from "../../lib/email";
import { checkRateLimit, RateLimitPresets, createRateLimitHeaders } from "../../lib/rate-limit";
import { Validators, Sanitizers } from "../../lib/validation";

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
    const client = await pool.connect();

    try {
        // ⚡ Rate limiting (5 transfers per hour)
        const rateLimit = checkRateLimit(request, RateLimitPresets.TRANSFER);

        if (!rateLimit.success) {
            console.warn(`[Transfer API] Rate limit exceeded`);
            return NextResponse.json(
                {
                    success: false,
                    error: "Transfer limit exceeded. Please try again later.",
                    retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000)
                },
                {
                    status: 429,
                    headers: createRateLimitHeaders(rateLimit)
                }
            );
        }

        const session = await getAuthenticatedSession(request);

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Access denied. Unauthorized session." },
                { status: 401 }
            );
        }

        const { message, recipientOrgId, transferMode } = await request.json();
        const isNewOnly = transferMode === "new_only";

        // 1.5 Backend Double-Guard: Prevent self-transfer transactions
        if (session.orgId === recipientOrgId) {
            return NextResponse.json(
                { success: false, error: "Self-transfer of workspace data is strictly forbidden." },
                { status: 400 }
            );
        }

        // Input validation
        if (!recipientOrgId || typeof recipientOrgId !== "string") {
            return NextResponse.json(
                { success: false, error: "Target recipient organization is required." },
                { status: 400 }
            );
        }

        if (!Validators.orgId(recipientOrgId)) {
            return NextResponse.json(
                { success: false, error: "Invalid organization ID format." },
                { status: 400 }
            );
        }

        // Sanitize and validate message
        const messageValidation = Validators.message(message || "", 5000);
        if (!messageValidation.valid) {
            return NextResponse.json(
                { success: false, error: messageValidation.error },
                { status: 400 }
            );
        }
        const cleanMessage = messageValidation.sanitized || "";

        // 2. Resolve recipient organization properties (for email notification)
        const recipientResult = await client.query(
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
        const alphaOrgId = process.env.ALPHA_ORG_ID || "org-a";
        const betaOrgId = process.env.BETA_ORG_ID || "org-b";

        const recipientEmail = recipientOrgId === alphaOrgId
            ? (process.env.ALPHA_EMAIL || recipient.email)
            : recipientOrgId === betaOrgId
                ? (process.env.BETA_EMAIL || recipient.email)
                : recipient.email;

        // 3. START TRANSACTION for ACID compliance and rollback safety
        await client.query('BEGIN');

        const startTime = Date.now();

        // 4. ULTRA-FAST: Single INSERT...SELECT query (no loops, no multiple queries)
        // When transferMode='new_only', exclude rows originally sourced from the recipient
        const transferResult = await client.query(
            `INSERT INTO organization_data (org_id, record_name, category, metric_value, security_level, status, custodian_email, source_record_id)
            SELECT 
                $2::VARCHAR(50) as org_id,
                s.record_name,
                s.category,
                s.metric_value,
                s.security_level,
                s.status,
                s.custodian_email,
                s.id as source_record_id
            FROM organization_data s
            WHERE s.org_id = $1::VARCHAR(50)
            AND NOT EXISTS (
                SELECT 1 FROM organization_data r
                WHERE r.org_id = $2::VARCHAR(50)
                AND r.source_record_id = s.id
            )
            ${isNewOnly ? `AND (s.source_record_id IS NULL OR s.source_record_id NOT IN (
                SELECT id FROM organization_data WHERE org_id = $2::VARCHAR(50)
            ))` : ""}
            RETURNING id`,
            [session.orgId, recipientOrgId]
        );

        const rowCount = transferResult.rowCount || 0;

        if (rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
                {
                    success: false, error: isNewOnly
                        ? "No new original records to transfer. You have no data that wasn't received from this organization."
                        : "No new records to transfer. All data has already been transferred to this organization."
                },
                { status: 400 }
            );
        }

        // 5. Commit Transfer Ledger Log
        await client.query(
            `INSERT INTO transfers (sender_org_id, recipient_org_id, message, row_count)
            VALUES ($1, $2, $3, $4)`,
            [session.orgId, recipientOrgId, cleanMessage, rowCount]
        );

        // 6. COMMIT TRANSACTION - All or nothing!
        await client.query('COMMIT');

        const duration = Date.now() - startTime;

        console.log(
            `[Transfer API] ⚡ LIGHTNING FAST: Org ${session.orgId} transferred ${rowCount} records to Org ${recipientOrgId} in ${duration}ms (${Math.round(rowCount / (duration / 1000))} records/sec)`
        );

        // 7. Dispatch Rich Notification Email Alert to Recipient Org (non-blocking, async)
        // Fire and forget - don't wait for email to complete
        setImmediate(async () => {
            try {
                const emailTemplate = getTransferEmailTemplate(session.orgName, cleanMessage, rowCount, transferMode, session.email);
                const alphaOrgId = process.env.ALPHA_ORG_ID || "org-a";
                const senderEmail = session.orgId === alphaOrgId
                    ? (process.env.ALPHA_EMAIL || "alpha@example.com")
                    : (process.env.BETA_EMAIL || "beta@example.com");

                await sendEmail({
                    to: recipientEmail,
                    subject: emailTemplate.subject,
                    text: emailTemplate.text,
                    html: emailTemplate.html,
                    fromName: `${session.orgName} via Platform`,
                    replyTo: session.email,
                });
                console.log(`[Transfer API] 📧 Email dispatched to ${recipientEmail}`);
            } catch (emailErr: any) {
                console.warn(`[Transfer API] ⚠️ Email notification failed: ${emailErr.message}`);
            }
        });

        return NextResponse.json({
            success: true,
            senderOrgName: session.orgName,
            recipientOrgName: recipient.name,
            rowCount,
            duration: `${duration}ms`,
            throughput: `${Math.round(rowCount / (duration / 1000))} records/sec`,
            message: `⚡ Lightning transfer complete! ${rowCount} records migrated to ${recipient.name} in ${duration}ms.`,
        });
    } catch (err: any) {
        // ROLLBACK on any error to maintain data integrity
        await client.query('ROLLBACK');
        console.error("[Transfer API] ❌ Error executing data transfer transaction:", err);
        return NextResponse.json(
            { success: false, error: "Failed to compile data transfer transaction." },
            { status: 500 }
        );
    } finally {
        // Always release the connection back to the pool
        client.release();
    }
}

export async function GET(request: Request) {
    try {
        const session = await getAuthenticatedSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: "Access denied. Unauthorized session." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const recipientOrgId = searchParams.get("recipientOrgId");

        if (!recipientOrgId) {
            return NextResponse.json(
                { success: false, error: "recipientOrgId query parameter is required." },
                { status: 400 }
            );
        }

        // Run both checks concurrently
        const [pendingRes, receivedRes, newRowsRes] = await Promise.all([
            // 1. Pending records to transfer (as before)
            query(
                `SELECT COUNT(*)::int as pending_count
                FROM organization_data s
                WHERE s.org_id = $1::VARCHAR(50)
                AND NOT EXISTS (
                    SELECT 1 FROM organization_data r
                    WHERE r.org_id = $2::VARCHAR(50)
                    AND r.source_record_id = s.id
                )`,
                [session.orgId, recipientOrgId]
            ),
            // 2. Has this org previously RECEIVED data from the recipient?
            query(
                `SELECT COUNT(*)::int as received_count
                FROM transfers
                WHERE sender_org_id = $1
                AND recipient_org_id = $2`,
                [recipientOrgId, session.orgId]
            ),
            // 3. Count rows in current org that are NOT sourced from the recipient
            //    AND have not yet been transferred to the recipient
            query(
                `SELECT COUNT(*)::int as new_rows_count
                FROM organization_data s
                WHERE s.org_id = $1
                AND (s.source_record_id IS NULL OR s.source_record_id NOT IN (
                    SELECT id FROM organization_data WHERE org_id = $2
                ))
                AND NOT EXISTS (
                    SELECT 1 FROM organization_data r
                    WHERE r.org_id = $2
                    AND r.source_record_id = s.id
                )`,
                [session.orgId, recipientOrgId]
            ),
        ]);

        const pendingCount = pendingRes.rows[0]?.pending_count ?? 0;
        const receivedCount = receivedRes.rows[0]?.received_count ?? 0;
        const newRowsCount = newRowsRes.rows[0]?.new_rows_count ?? 0;

        // Warn if: we received from this org before, AND we have no new original rows beyond what came from them
        const hasReceivedFromRecipient = receivedCount > 0;
        const dataUnchangedSinceReceived = hasReceivedFromRecipient && newRowsCount === 0;

        return NextResponse.json({
            success: true,
            pendingCount,
            hasReceivedFromRecipient,
            dataUnchangedSinceReceived,
            newRowsCount,
        });
    } catch (err: any) {
        console.error("[Transfer API GET] Error checking transfer status:", err);
        return NextResponse.json(
            { success: false, error: "Failed to check transfer eligibility status." },
            { status: 500 }
        );
    }
}

