import { NextResponse, NextRequest } from "next/server";
import { query } from "../../lib/db";
import { verifySession } from "../../lib/auth";

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get("session")?.value;
        const session = token ? await verifySession(token) : null;

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
        }

        const senderOrgId = session.orgId;

        // Retrieve all active organizations excluding the sender's own organization
        const result = await query(
            `SELECT id, name, email FROM organizations WHERE id != $1 ORDER BY name ASC`,
            [senderOrgId]
        );

        return NextResponse.json({
            success: true,
            organizations: result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                email: row.email,
            })),
        });
    } catch (err: any) {
        console.error("[Organizations API] Failed to fetch targeting list:", err);
        return NextResponse.json({ success: false, error: "Failed to load recipient workspaces." }, { status: 500 });
    }
}
