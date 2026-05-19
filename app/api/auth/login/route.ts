import { NextResponse } from "next/server";
import { signSession } from "../../../lib/auth";
import { query } from "../../../lib/db";
import bcrypt from "bcryptjs";
import { checkRateLimit, RateLimitPresets, createRateLimitHeaders } from "../../../lib/rate-limit";
import { Validators } from "../../../lib/validation";

// Pre-hash static passwords at module load for faster comparison
const staticUsers = [
    {
        email: (process.env.ALPHA_EMAIL?.toLowerCase() || "alpha@example.com"),
        passwordHash: bcrypt.hashSync(process.env.ALPHA_PASSWORD || "password123", 10),
        orgName: process.env.ALPHA_ORG_NAME || "Organization Alpha",
        orgId: process.env.ALPHA_ORG_ID || "org-a",
    },
    {
        email: (process.env.BETA_EMAIL?.toLowerCase() || "beta@example.com"),
        passwordHash: bcrypt.hashSync(process.env.BETA_PASSWORD || "password123", 10),
        orgName: process.env.BETA_ORG_NAME || "Organization Beta",
        orgId: process.env.BETA_ORG_ID || "org-b",
    },
];

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        // ⚡ Rate limiting (5 requests per minute)
        const rateLimit = checkRateLimit(request, RateLimitPresets.AUTH);

        if (!rateLimit.success) {
            console.warn(`[Login] Rate limit exceeded`);
            return NextResponse.json(
                {
                    success: false,
                    error: "Too many login attempts. Please try again later.",
                    retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000)
                },
                {
                    status: 429,
                    headers: createRateLimitHeaders(rateLimit)
                }
            );
        }

        const { email, password } = await request.json();

        // Input validation
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required credentials." },
                { status: 400 }
            );
        }

        if (!Validators.email(email)) {
            return NextResponse.json(
                { success: false, error: "Invalid email format." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // ⚡ STEP 1: Check static users first (fastest path - no DB query)
        let userMatch = staticUsers.find((u) => u.email === normalizedEmail);
        let isDbUser = false;
        let dbOrg: any = null;

        if (userMatch) {
            // Fast path: Static user from .env
            const isPasswordValid = await bcrypt.compare(password, userMatch.passwordHash);

            if (!isPasswordValid) {
                console.warn(`[Login] Wrong password for static user: ${normalizedEmail}`);
                return NextResponse.json(
                    { success: false, error: "Invalid credentials or organization not found." },
                    { status: 401 }
                );
            }
        } else {
            // ⚡ STEP 2: Query database for dynamic users (only if not static)
            const dbQueryRes = await query(
                `SELECT id, name, email, password FROM organizations WHERE email = $1`,
                [normalizedEmail]
            );

            if (dbQueryRes.rows.length === 0) {
                console.warn(`[Login] No user found for email: ${normalizedEmail}`);
                return NextResponse.json(
                    { success: false, error: "Email does not exist. Please sign up." },
                    { status: 404 }
                );
            }

            dbOrg = dbQueryRes.rows[0];
            isDbUser = true;

            // Verify password for DB user
            const isPasswordValid = await bcrypt.compare(password, dbOrg.password || "");

            if (!isPasswordValid) {
                console.warn(`[Login] Wrong password for DB user: ${normalizedEmail}`);
                return NextResponse.json(
                    { success: false, error: "Invalid credentials or organization not found." },
                    { status: 401 }
                );
            }

            userMatch = {
                email: dbOrg.email.toLowerCase(),
                passwordHash: dbOrg.password,
                orgName: dbOrg.name,
                orgId: dbOrg.id,
            };
        }

        // ⚡ STEP 4: Build response without setting secure session cookie (done after OTP verification in verify/route.ts)
        const response = NextResponse.json({
            success: true,
            email: normalizedEmail,
            orgId: userMatch.orgId,
            orgName: userMatch.orgName,
            message: `Credentials verified. OTP required to complete authentication.`,
        });

        const duration = Date.now() - startTime;
        console.log(`[Login] ⚡ Authenticated ${normalizedEmail} in ${duration}ms`);

        // Add rate limit headers
        const rateLimitHeaders = createRateLimitHeaders(rateLimit);
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error(`[Login] Error after ${duration}ms:`, err);
        return NextResponse.json(
            { success: false, error: "Authentication system failure. Please try again." },
            { status: 500 }
        );
    }
}
