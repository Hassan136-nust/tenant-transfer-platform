/**
 * Rate Limiting Utility
 * Prevents abuse and brute-force attacks
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the time window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Optional custom identifier (defaults to IP address) */
    identifier?: string;
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Check if a request should be rate limited
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
    request: Request,
    config: RateLimitConfig
): RateLimitResult {
    const { maxRequests, windowMs, identifier } = config;

    // Get identifier (IP address or custom identifier)
    const key = identifier || getClientIdentifier(request);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired entry
        entry = {
            count: 0,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    const remaining = Math.max(0, maxRequests - entry.count);
    const success = entry.count <= maxRequests;

    if (!success) {
        console.warn(
            `[Rate Limit] Blocked request from ${key} - ${entry.count}/${maxRequests} requests`
        );
    }

    return {
        success,
        limit: maxRequests,
        remaining,
        reset: entry.resetTime,
    };
}

/**
 * Get client identifier from request (IP address)
 * @param request - Next.js request object
 * @returns Client identifier
 */
function getClientIdentifier(request: Request): string {
    // Try to get real IP from headers (for proxies/load balancers)
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    // Fallback to a generic identifier
    return "unknown";
}

/**
 * Rate limit presets for common use cases
 */
export const RateLimitPresets = {
    /** Strict rate limit for authentication endpoints (5 requests per minute) */
    AUTH: {
        maxRequests: 5,
        windowMs: 60 * 1000, // 1 minute
    },

    /** Moderate rate limit for OTP generation (3 requests per minute) */
    OTP: {
        maxRequests: 3,
        windowMs: 60 * 1000, // 1 minute
    },

    /** Standard rate limit for API endpoints (30 requests per minute) */
    API: {
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
    },

    /** Strict rate limit for data transfer (5 transfers per hour) */
    TRANSFER: {
        maxRequests: 8,
        windowMs: 60 * 60 * 1000, // 1 hour
    },

    /** Lenient rate limit for read operations (100 requests per minute) */
    READ: {
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 minute
    },
};

/**
 * Create rate limit response headers
 * @param result - Rate limit result
 * @returns Headers object
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.reset).toISOString(),
        "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
    };
}

/**
 * Clear rate limit for a specific identifier (useful for testing)
 * @param identifier - Client identifier
 */
export function clearRateLimit(identifier: string): void {
    rateLimitStore.delete(identifier);
    console.log(`[Rate Limit] Cleared rate limit for ${identifier}`);
}

/**
 * Get current rate limit stats (for monitoring)
 */
export function getRateLimitStats(): {
    totalEntries: number;
    entries: Array<{ key: string; count: number; resetTime: number }>;
} {
    const entries = Array.from(rateLimitStore.entries()).map(([key, entry]) => ({
        key,
        count: entry.count,
        resetTime: entry.resetTime,
    }));

    return {
        totalEntries: rateLimitStore.size,
        entries,
    };
}
