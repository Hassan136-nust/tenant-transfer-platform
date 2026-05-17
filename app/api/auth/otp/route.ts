import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { sendEmail, getOTPEmailTemplate } from "../../../lib/email";
import { validateEmail, isEmailValid, getValidationErrorMessage } from "../../../lib/zerobounce";
import { checkRateLimit, RateLimitPresets, createRateLimitHeaders } from "../../../lib/rate-limit";
import { Validators } from "../../../lib/validation";

export async function POST(request: Request) {
    try {
        // ⚡ STEP 0: Rate limiting (3 requests per minute)
        const rateLimit = checkRateLimit(request, RateLimitPresets.OTP);

        if (!rateLimit.success) {
            console.warn(`[OTP] Rate limit exceeded`);
            return NextResponse.json(
                {
                    success: false,
                    error: "Too many OTP requests. Please try again later.",
                    retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000)
                },
                {
                    status: 429,
                    headers: createRateLimitHeaders(rateLimit)
                }
            );
        }

        const { email } = await request.json();

        // Input validation
        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { success: false, error: "Valid email required." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Validate email format
        if (!Validators.email(normalizedEmail)) {
            return NextResponse.json(
                { success: false, error: "Invalid email format." },
                { status: 400 }
            );
        }

        // ⚡ STEP 1: Fast email validation with ZeroBounce (with caching)
        const startValidation = Date.now();

        try {
            const validationResult = await validateEmail(normalizedEmail);

            if (validationResult) {
                const validationDuration = Date.now() - startValidation;
                console.log(`[OTP] Email validation completed in ${validationDuration}ms - Status: ${validationResult.status}`);

                // Check if email is valid
                if (!["valid", "catch-all"].includes(validationResult.status)) {
                    const errorMessage = getValidationErrorMessage(validationResult);
                    console.warn(`[OTP] ❌ Invalid email REJECTED: ${normalizedEmail} - Status: ${validationResult.status}`);

                    return NextResponse.json(
                        {
                            success: false,
                            error: errorMessage,
                            suggestion: validationResult.did_you_mean || undefined,
                            status: validationResult.status
                        },
                        { status: 400 }
                    );
                }

                // Log additional info for valid emails
                console.log(`[OTP] ✅ Email VALIDATED: ${normalizedEmail} - Free: ${validationResult.free_email}, Provider: ${validationResult.smtp_provider || 'N/A'}`);
            } else {
                console.error(`[OTP] ⚠️ ZeroBounce validation SKIPPED (no API key) - Email: ${normalizedEmail}`);
                console.error(`[OTP] ⚠️ WARNING: Invalid emails will NOT be blocked!`);
            }
        } catch (validationError: any) {
            // If validation fails, log but continue (fail-open approach)
            console.warn(`[OTP] ⚠️ Email validation failed, continuing anyway: ${validationError.message}`);
        }

        // ⚡ STEP 2: Generate OTP code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // ⚡ STEP 3: Store OTP in database (async, don't wait)
        const dbPromise = query(
            `INSERT INTO otp_records (email, code, expires_at, verified)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (email)
       DO UPDATE SET code = $2, expires_at = $3, verified = FALSE`,
            [normalizedEmail, code, expiresAt]
        );

        // ⚡ STEP 4: Send email immediately (parallel with DB)
        const emailTemplate = getOTPEmailTemplate(code);
        const emailPromise = sendEmail({
            to: normalizedEmail,
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html
        });

        // Wait for both operations to complete
        const [dbResult, emailResult] = await Promise.allSettled([dbPromise, emailPromise]);

        let emailSent = false;
        if (emailResult.status === "fulfilled") {
            emailSent = true;
            console.log(`[OTP] ✅ Email delivered to ${normalizedEmail}`);
        } else {
            console.warn(`[OTP] ⚠️ Email failed: ${emailResult.reason?.message}`);
        }

        if (dbResult.status === "rejected") {
            console.error(`[OTP] ❌ Database error: ${dbResult.reason}`);
            throw new Error("Failed to store OTP");
        }

        console.log(`[OTP] Generated code ${code} for ${normalizedEmail}`);

        // Print the code prominently in the terminal for development
        console.log(`\n\n🔑 [OTP CODE FOR ${normalizedEmail}]: ${code} 🔑\n\n`);

        return NextResponse.json({
            success: true,
            message: emailSent
                ? "OTP verification code sent to your email."
                : `SMTP offline. Verification code printed to server terminal: ${code}`
        }, {
            headers: createRateLimitHeaders(rateLimit)
        });
    } catch (err: any) {
        console.error("[OTP] Error:", err);
        return NextResponse.json({ success: false, error: "Failed to send OTP." }, { status: 500 });
    }
}
