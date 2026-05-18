import { NextResponse, NextRequest } from "next/server";
import { query } from "../../../lib/db";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email")?.toLowerCase().trim();

        if (!email) {
            return NextResponse.json({ success: true, exists: false });
        }

        // 1. Check static user emails (fast path - 0ms execution)
        const staticEmails = [
            (process.env.ALPHA_EMAIL?.toLowerCase() || "alpha@example.com"),
            (process.env.BETA_EMAIL?.toLowerCase() || "beta@example.com")
        ];

        if (staticEmails.includes(email)) {
            return NextResponse.json({ success: true, exists: true });
        }

        // 2. Query Neon Database (fully indexed lookup - 0-1ms execution)
        const result = await query(
            "SELECT id FROM organizations WHERE email = $1",
            [email]
        );

        return NextResponse.json({
            success: true,
            exists: result.rows.length > 0
        });
    } catch (err: any) {
        console.error("[Check Email API] Verification failed:", err);
        return NextResponse.json({ success: false, error: "Validation server error" }, { status: 500 });
    }
}
