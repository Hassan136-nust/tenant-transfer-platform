import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import crypto from "crypto";
import { jwtVerify } from "jose";

const getSecretKey = () => {
    const secret = process.env.JWT_SECRET || "fallback-secret-for-signing-cookies-123456789";
    return new TextEncoder().encode(secret);
};

export async function POST(request: Request) {
    try {
        const cookieHeader = request.headers.get("cookie") || "";
        const cookies = Object.fromEntries(
            cookieHeader.split(";").map((cookie) => {
                const [key, ...val] = cookie.trim().split("=");
                return [key, decodeURIComponent(val.join("="))];
            })
        );
        const token = cookies.session;

        if (token) {
            const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

            // Decrypt token to check exp dynamic timestamp, default to 24h from now
            let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            try {
                const secret = getSecretKey();
                const { payload } = await jwtVerify(token, secret);
                if (payload && typeof payload.exp === "number") {
                    expiresAt = new Date(payload.exp * 1000);
                }
            } catch (err) {
                console.warn("[Logout] Token translation fallback:", err);
            }

            await query(
                `INSERT INTO blacklisted_tokens (token_hash, expires_at)
                 VALUES ($1, $2)
                 ON CONFLICT (token_hash) DO NOTHING`,
                [tokenHash, expiresAt]
            );
            console.log(`[Logout API] Blacklisted token hash: ${tokenHash}`);
        }

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
