import { NextResponse } from "next/server";

export async function POST() {
    try {
        const response = NextResponse.json({
            success: true,
            message: "Successfully logged out of workspace.",
        });

        // Overwrite cookie with an immediately expired date to clear it securely
        response.headers.set(
            "Set-Cookie",
            "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax;"
        );

        return response;
    } catch (err: any) {
        console.error("[Logout API] Error clearing session cookie:", err);
        return NextResponse.json(
            { success: false, error: "Logout failed." },
            { status: 500 }
        );
    }
}
