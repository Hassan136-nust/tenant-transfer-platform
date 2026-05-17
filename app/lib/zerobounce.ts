/**
 * ZeroBounce Email Validation Service
 * Ultra-fast email validation with caching
 */

const ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY || process.env.ZEROBOUNCE_KEY;
const ZEROBOUNCE_API_URL = "https://api.zerobounce.net/v2/validate";

// In-memory cache to avoid redundant API calls (1 hour TTL)
const validationCache = new Map<string, { result: ZeroBounceResult; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export interface ZeroBounceResult {
    address: string;
    status: "valid" | "invalid" | "catch-all" | "unknown" | "spamtrap" | "abuse" | "do_not_mail";
    sub_status: string;
    free_email: boolean;
    did_you_mean: string | null;
    account: string;
    domain: string;
    domain_age_days: string;
    smtp_provider: string;
    mx_found: string;
    mx_record: string;
    firstname: string | null;
    lastname: string | null;
    gender: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    zipcode: string | null;
    processed_at: string;
}

export interface ZeroBounceError {
    error: string;
}

/**
 * Validates an email address using ZeroBounce API
 * @param email - Email address to validate
 * @param ipAddress - Optional IP address for additional validation
 * @returns Validation result or null if API key not configured
 */
export async function validateEmail(
    email: string,
    ipAddress?: string
): Promise<ZeroBounceResult | null> {
    // If no API key configured, skip validation (development mode)
    if (!ZEROBOUNCE_API_KEY) {
        console.error("❌ [ZeroBounce] API key not configured! Set ZEROBOUNCE_API_KEY or ZEROBOUNCE_KEY in .env.local");
        console.error("❌ [ZeroBounce] Email validation is DISABLED - all emails will be accepted!");
        return null;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check cache first for instant response
    const cached = validationCache.get(normalizedEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[ZeroBounce] ⚡ Cache hit for ${normalizedEmail} - Status: ${cached.result.status}`);
        return cached.result;
    }

    try {
        const url = new URL(ZEROBOUNCE_API_URL);
        url.searchParams.append("api_key", ZEROBOUNCE_API_KEY);
        url.searchParams.append("email", normalizedEmail);
        if (ipAddress) {
            url.searchParams.append("ip_address", ipAddress);
        }

        const startTime = Date.now();
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json",
            },
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            throw new Error(`ZeroBounce API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Check for API error response
        if ("error" in data) {
            const errorData = data as ZeroBounceError;
            throw new Error(errorData.error);
        }

        const result = data as ZeroBounceResult;

        // Cache the result
        validationCache.set(normalizedEmail, {
            result,
            timestamp: Date.now(),
        });

        console.log(
            `[ZeroBounce] ✅ Validated ${normalizedEmail} in ${duration}ms - Status: ${result.status}, Free: ${result.free_email}, Provider: ${result.smtp_provider || 'N/A'}`
        );

        return result;
    } catch (error: any) {
        console.error(`[ZeroBounce] ❌ Validation failed for ${normalizedEmail}:`, error.message);
        throw error;
    }
}

/**
 * Checks if an email is valid and safe to send to
 * @param email - Email address to check
 * @param ipAddress - Optional IP address
 * @returns true if email is valid, false otherwise
 */
export async function isEmailValid(email: string, ipAddress?: string): Promise<boolean> {
    try {
        const result = await validateEmail(email, ipAddress);

        // If validation is disabled (no API key), allow all emails
        if (!result) {
            return true;
        }

        // Only accept "valid" and "catch-all" emails
        // Reject: invalid, unknown, spamtrap, abuse, do_not_mail
        const acceptableStatuses = ["valid", "catch-all"];
        return acceptableStatuses.includes(result.status);
    } catch (error) {
        // On error, fail open (allow email) to prevent blocking users
        console.warn("[ZeroBounce] Validation error, allowing email by default");
        return true;
    }
}

/**
 * Gets a user-friendly error message for invalid emails
 * @param result - ZeroBounce validation result
 * @returns User-friendly error message
 */
export function getValidationErrorMessage(result: ZeroBounceResult): string {
    switch (result.status) {
        case "invalid":
            if (result.did_you_mean) {
                return `Invalid email address. Did you mean ${result.did_you_mean}?`;
            }
            return "Invalid email address. Please check and try again.";
        case "spamtrap":
        case "abuse":
            return "This email address cannot be used. Please use a different email.";
        case "do_not_mail":
            return "This email address is on a do-not-mail list. Please use a different email.";
        case "unknown":
            return "Unable to verify this email address. Please check and try again.";
        default:
            return "Email validation failed. Please try a different email address.";
    }
}

/**
 * Clears the validation cache (useful for testing)
 */
export function clearValidationCache(): void {
    validationCache.clear();
    console.log("[ZeroBounce] Cache cleared");
}
