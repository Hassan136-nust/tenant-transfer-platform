import { NextResponse } from "next/server";
import { signSession } from "../../../lib/auth";
import { query } from "../../../lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required credentials." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        const users = [
            {
                email: process.env.ALPHA_EMAIL?.toLowerCase() || "alpha@example.com",
                passwordRaw: process.env.ALPHA_PASSWORD || "password123",
                orgName: process.env.ALPHA_ORG_NAME || "Organization Alpha",
                orgId: process.env.ALPHA_ORG_ID || "org-a",
            },
            {
                email: process.env.BETA_EMAIL?.toLowerCase() || "beta@example.com",
                passwordRaw: process.env.BETA_PASSWORD || "password123",
                orgName: process.env.BETA_ORG_NAME || "Organization Beta",
                orgId: process.env.BETA_ORG_ID || "org-b",
            },
        ];

        let userMatch = users.find((u) => u.email === normalizedEmail);
        let isDbUser = false;
        let dbOrg: any = null;

        if (!userMatch) {
            // Logically fall back to querying registered organizations in PostgreSQL
            const dbQueryRes = await query(
                `SELECT id, name, email, password FROM organizations WHERE email = $1`,
                [normalizedEmail]
            );

            if (dbQueryRes.rows.length > 0) {
                dbOrg = dbQueryRes.rows[0];
                isDbUser = true;
                userMatch = {
                    email: dbOrg.email.toLowerCase(),
                    passwordRaw: "", // Not used since password check uses bcrypt on stored hash
                    orgName: dbOrg.name,
                    orgId: dbOrg.id,
                };
            }
        }

        if (!userMatch) {
            console.warn(`[JWT Auth] No user matched email: "${normalizedEmail}". Available: ${users.map(u => u.email).join(", ")}`);
            return NextResponse.json(
                { success: false, error: "Invalid credentials or organization not found." },
                { status: 401 }
            );
        }

        // Direct password comparison. 
        // Static .env.local users use bcrypt salting of plain-text value. 
        // Database-registered dynamic users use direct bcrypt comparison of stored hashes.
        let isPasswordValid = false;
        if (isDbUser && dbOrg) {
            isPasswordValid = await bcrypt.compare(password, dbOrg.password || "");
        } else {
            isPasswordValid = await bcrypt.compare(password, bcrypt.hashSync(userMatch.passwordRaw, 10));
        }

        if (!isPasswordValid) {
            console.warn(`[JWT Auth] Wrong password for: ${normalizedEmail}`);
            return NextResponse.json(
                { success: false, error: "Invalid credentials or organization not found." },
                { status: 401 }
            );
        }

        // 3. Generate secured JWT cryptographic session signature
        const sessionToken = await signSession({
            email: normalizedEmail,
            orgId: userMatch.orgId,
            orgName: userMatch.orgName,
            role: "admin"
        });

        // 4. Build responses containing secure JWT cookie
        const response = NextResponse.json({
            success: true,
            email: normalizedEmail,
            orgId: userMatch.orgId,
            orgName: userMatch.orgName,
            message: `Successfully authenticated into ${userMatch.orgName}.`,
        });

        const cookieString = `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""
            }`;

        response.headers.set("Set-Cookie", cookieString);

        console.log(`[JWT Auth] Secure Edge Login Issued For: ${normalizedEmail}`);

        return response;
    } catch (err: any) {
        console.error("[JWT Auth] Error handling password login:", err);
        return NextResponse.json(
            { success: false, error: "Authentication system failure. Please try again." },
            { status: 500 }
        );
    }
}
