import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { verifySession } from "../../../lib/auth";

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

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getAuthenticatedSession(request);

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Access denied. Unauthorized session." },
                { status: 401 }
            );
        }

        const { id } = await params;
        const rowId = parseInt(id, 10);

        if (isNaN(rowId)) {
            return NextResponse.json(
                { success: false, error: "Invalid record ID." },
                { status: 400 }
            );
        }

        // Secure DELETE operation restricted strictly to host organization
        const deleteResult = await query(
            `DELETE FROM organization_data WHERE id = $1 AND org_id = $2 RETURNING id`,
            [rowId, session.orgId]
        );

        if (deleteResult.rows.length === 0) {
            console.warn(
                `[Rows DELETE API] Unauthorized deletion attempt or missing record: row ${rowId} by Org ${session.orgId}`
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Record not found or user lacks permission to modify this data.",
                },
                { status: 403 }
            );
        }

        console.log(`[Rows DELETE API] Org ${session.orgId} successfully deleted row ID: ${rowId}`);

        return NextResponse.json({
            success: true,
            message: "Data record successfully purged.",
        });
    } catch (err: any) {
        console.error("[Rows DELETE API] Error handling row deletion:", err);
        return NextResponse.json(
            { success: false, error: "Failed to purge record from database." },
            { status: 500 }
        );
    }
}
