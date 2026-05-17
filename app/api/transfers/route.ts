import { NextResponse } from "next/server";
import { query } from "../../lib/db";
import { verifySession } from "../../lib/auth";

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

export async function GET(request: Request) {
    try {
        const session = await getAuthenticatedSession(request);

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Access denied. Unauthorized session." },
                { status: 401 }
            );
        }

        // Retrieve transfer records and join organization names dynamically
        const transfersResult = await query(
            `SELECT t.id, t.sender_org_id, t.recipient_org_id, t.message, t.row_count, t.transferred_at,
              org_s.name AS sender_name, org_r.name AS recipient_name
       FROM transfers t
       JOIN organizations org_s ON t.sender_org_id = org_s.id
       JOIN organizations org_r ON t.recipient_org_id = org_r.id
       WHERE t.sender_org_id = $1 OR t.recipient_org_id = $1
       ORDER BY t.transferred_at DESC`,
            [session.orgId]
        );

        return NextResponse.json({
            success: true,
            orgId: session.orgId,
            transfers: transfersResult.rows,
        });
    } catch (err: any) {
        console.error("[Transfers History API] Error fetching history logs:", err);
        return NextResponse.json(
            { success: false, error: "Failed to load transfer logs." },
            { status: 500 }
        );
    }
}
