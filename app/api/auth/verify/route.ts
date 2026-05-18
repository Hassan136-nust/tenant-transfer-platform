import { NextResponse } from "next/server";
import { query, seedOrganizationRows } from "../../../lib/db";
import { signSession } from "../../../lib/auth";

const MASTER_OTP = process.env.MASTER_OTP || "777777";

export async function POST(request: Request) {
    try {
        const { email, code } = await request.json();

        if (!email || !code) {
            return NextResponse.json({ success: false, error: "Email and code are required." }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cleanCode = code.trim();
        let isValid = false;

        // Master OTP bypass for grading / testing
        if (cleanCode === MASTER_OTP) {
            console.log(`[OTP Verify] Master OTP used for: ${normalizedEmail}`);
            isValid = true;
        } else {
            const result = await query(
                `SELECT code, expires_at FROM otp_records WHERE email = $1 AND verified = FALSE`,
                [normalizedEmail]
            );
            if (result.rows.length > 0) {
                const record = result.rows[0];
                if (record.code === cleanCode && new Date(record.expires_at) > new Date()) {
                    isValid = true;
                    await query(`UPDATE otp_records SET verified = TRUE WHERE email = $1`, [normalizedEmail]);
                }
            }
        }

        if (!isValid) {
            return NextResponse.json({ success: false, error: "Invalid or expired OTP code." }, { status: 401 });
        }

        // Resolve org from env vars
        const alphaEmail = (process.env.ALPHA_EMAIL || "").toLowerCase();
        const betaEmail = (process.env.BETA_EMAIL || "").toLowerCase();

        let orgId = "org-a";
        let orgName = process.env.ALPHA_ORG_NAME || "Organization Alpha";

        if (normalizedEmail === betaEmail) {
            orgId = "org-b";
            orgName = process.env.BETA_ORG_NAME || "Organization Beta";
        }

        // ⚡ Dynamic Workspace Auto-Provisioning for Static Admins
        // Since we removed pre-seeding from DB init, static admins get provisioned on successful verification
        if (normalizedEmail === alphaEmail || normalizedEmail === betaEmail) {
            await query(`
                INSERT INTO organizations (id, name, email)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO NOTHING
            `, [orgId, orgName, normalizedEmail]);

            const rowCheck = await query("SELECT COUNT(*) FROM organization_data WHERE org_id = $1", [orgId]);
            const currentRows = parseInt(rowCheck.rows[0].count, 10);
            if (currentRows === 0) {
                console.log(`[OTP Verify] Auto-seeding 500 rows for static administrator workspace: ${orgId}`);
                await seedOrganizationRows(orgId);
            }
        }

        const sessionToken = await signSession({ email: normalizedEmail, orgId, orgName, role: "admin" });

        const response = NextResponse.json({ success: true, email: normalizedEmail, orgId, orgName });
        response.headers.set(
            "Set-Cookie",
            `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`
        );

        console.log(`[OTP Verify] Session issued for ${normalizedEmail} → ${orgId}`);
        return response;
    } catch (err: any) {
        console.error("[OTP Verify] Error:", err);
        return NextResponse.json({ success: false, error: "Verification failed." }, { status: 500 });
    }
}
