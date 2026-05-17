import { NextResponse } from "next/server";
import { query, seedOrganizationRows } from "../../../lib/db";
import { signSession } from "../../../lib/auth";
import bcrypt from "bcryptjs";
import { validateEmail, getValidationErrorMessage } from "../../../lib/zerobounce";

const MASTER_OTP = process.env.MASTER_OTP || "777777";

export async function POST(request: Request) {
    try {
        const { email, password, orgName, otpCode, seedData } = await request.json();

        if (!email || !password || !orgName || !otpCode) {
            return NextResponse.json(
                { success: false, error: "All registration fields (Email, Password, Org Name, OTP) are required." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cleanOrgName = orgName.trim();
        const cleanCode = otpCode.trim();

        // 1. Verify OTP Code
        let isOtpValid = false;
        if (cleanCode === MASTER_OTP) {
            console.log(`[Signup API] Master OTP bypass used for email: ${normalizedEmail}`);
            isOtpValid = true;
        } else {
            const result = await query(
                `SELECT code, expires_at FROM otp_records WHERE email = $1 AND verified = FALSE`,
                [normalizedEmail]
            );
            if (result.rows.length > 0) {
                const record = result.rows[0];
                if (record.code === cleanCode && new Date(record.expires_at) > new Date()) {
                    isOtpValid = true;
                    // Mark code as verified so it cannot be reused
                    await query(`UPDATE otp_records SET verified = TRUE WHERE email = $1`, [normalizedEmail]);
                }
            }
        }

        if (!isOtpValid) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired OTP verification code." },
                { status: 400 }
            );
        }

        // 2. Ensure Email and Organization uniqueness
        // Create robust URL-friendly Organization Slug ID (e.g. "My Org" -> "my-org")
        const orgId = cleanOrgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");

        if (!orgId) {
            return NextResponse.json(
                { success: false, error: "Invalid organization name. Must contain alphanumeric characters." },
                { status: 400 }
            );
        }

        // Check against predefined .env.local emails to prevent hijacking
        const alphaEmail = (process.env.ALPHA_EMAIL || "").toLowerCase();
        const betaEmail = (process.env.BETA_EMAIL || "").toLowerCase();
        if (normalizedEmail === alphaEmail || normalizedEmail === betaEmail) {
            return NextResponse.json(
                { success: false, error: "This email belongs to a reserved system organization." },
                { status: 400 }
            );
        }

        // Check DB for existing email or organization Slug
        const existingOrgCheck = await query(
            `SELECT id, email FROM organizations WHERE id = $1 OR email = $2`,
            [orgId, normalizedEmail]
        );

        if (existingOrgCheck.rows.length > 0) {
            const matched = existingOrgCheck.rows[0];
            if (matched.id === orgId) {
                return NextResponse.json(
                    { success: false, error: `Organization name "${cleanOrgName}" is already registered. Please choose another.` },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { success: false, error: "This email is already registered to a workspace." },
                { status: 400 }
            );
        }

        // 3. Securely hash password with bcrypt
        const hashedPassword = bcrypt.hashSync(password, 10);

        // 4. Create new Organization tenant inside Database
        await query(
            `INSERT INTO organizations (id, name, email, password) VALUES ($1, $2, $3, $4)`,
            [orgId, cleanOrgName, normalizedEmail, hashedPassword]
        );

        console.log(`[Signup API] Organization registered: ${cleanOrgName} (ID: ${orgId}, Email: ${normalizedEmail})`);

        // 5. Seed Workspace with 500 records if requested
        if (seedData === true) {
            await seedOrganizationRows(orgId);
        }

        // 6. Automatically sign secure JWT and set cookie
        const sessionToken = await signSession({
            email: normalizedEmail,
            orgId,
            orgName: cleanOrgName,
            role: "admin",
        });

        const response = NextResponse.json({
            success: true,
            email: normalizedEmail,
            orgId,
            orgName: cleanOrgName,
            message: `Organization "${cleanOrgName}" successfully registered and prepared.`,
        });

        const cookieString = `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""
            }`;
        response.headers.set("Set-Cookie", cookieString);

        return response;
    } catch (err: any) {
        console.error("[Signup API] Server error during registration:", err);
        return NextResponse.json(
            { success: false, error: `Failed to create organization: ${err.message || err.toString()}` },
            { status: 500 }
        );
    }
}
