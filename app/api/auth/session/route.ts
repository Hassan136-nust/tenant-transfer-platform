import { NextResponse } from "next/server";
import { verifySession } from "../../../lib/auth";
import { query } from "../../../lib/db";

export async function GET(request: Request) {
    try {
        // 1. Recover cookies header
        const cookieHeader = request.headers.get("cookie") || "";
        const cookies = Object.fromEntries(
            cookieHeader.split(";").map((cookie) => {
                const [key, ...val] = cookie.trim().split("=");
                return [key, decodeURIComponent(val.join("="))];
            })
        );

        const token = cookies.session;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "No active session authentication found." },
                { status: 401 }
            );
        }

        // 2. Decode and cryptographically verify JWT signature
        const session = await verifySession(token);

        if (!session) {
            // Clear invalid tampered cookie immediately
            const response = NextResponse.json(
                { success: false, error: "Invalid or tampered workspace session." },
                { status: 401 }
            );
            response.headers.set(
                "Set-Cookie",
                "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax;"
            );
            return response;
        }

        // 3. Query Neon Database to verify organization existence (resolves ghost sessions)
        const orgCheck = await query(
            "SELECT id FROM organizations WHERE id = $1",
            [session.orgId]
        );

        if (orgCheck.rows.length === 0) {
            console.warn(`[Session API] Ghost session detected for deleted workspace ID: ${session.orgId}`);
            const response = NextResponse.json(
                { success: false, error: "Workspace organization no longer exists." },
                { status: 401 }
            );
            response.headers.set(
                "Set-Cookie",
                "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax;"
            );
            return response;
        }

        // 4. Return active verified credentials
        return NextResponse.json({
            success: true,
            email: session.email,
            orgId: session.orgId,
            orgName: session.orgName,
        });
    } catch (err: any) {
        console.error("[Session API] Failure recovering active session payload:", err);
        return NextResponse.json(
            { success: false, error: "Authentication system failure." },
            { status: 500 }
        );
    }
}
