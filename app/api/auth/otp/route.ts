import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { sendEmail, getOTPEmailTemplate } from "../../../lib/email";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { success: false, error: "Valid email required." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await query(
            `INSERT INTO otp_records (email, code, expires_at, verified)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (email)
       DO UPDATE SET code = $2, expires_at = $3, verified = FALSE`,
            [normalizedEmail, code, expiresAt]
        );

        console.log(`[OTP] Generated code ${code} for ${normalizedEmail}`);

        const template = getOTPEmailTemplate(code);
        let emailSent = false;

        try {
            await sendEmail({ to: normalizedEmail, subject: template.subject, text: template.text, html: template.html });
            emailSent = true;
            console.log(`[OTP Route] Email successfully delivered to ${normalizedEmail}`);
        } catch (emailErr: any) {
            console.warn(`[OTP Route] SMTP connection offline/failed. Falling back to terminal logging. Error: ${emailErr.message}`);
        }

        // Print the code prominently in the terminal so the user/developer is NEVER blocked
        console.log(`\n\n🔑🔑🔑 [DEVELOPMENT OTP CODE FOR ${normalizedEmail}]: ${code} 🔑🔑🔑\n\n`);

        return NextResponse.json({
            success: true,
            message: emailSent
                ? "OTP verification code sent to your email."
                : `SMTP offline. Verification code printed to server terminal: ${code}`
        });
    } catch (err: any) {
        console.error("[OTP] Error:", err);
        return NextResponse.json({ success: false, error: "Failed to send OTP." }, { status: 500 });
    }
}
