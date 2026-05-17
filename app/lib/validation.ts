/**
 * Input Validation Utility
 * Comprehensive server-side validation to prevent SQL injection, XSS, and other attacks
 */

/**
 * Sanitize string input to prevent XSS attacks
 * @param input - Raw string input
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
    if (typeof input !== "string") {
        return "";
    }

    return input
        .trim()
        .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
        .replace(/javascript:/gi, "") // Remove javascript: protocol
        .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
        .slice(0, 1000); // Limit length to prevent DoS
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
    if (typeof email !== "string") {
        return false;
    }

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with error message if invalid
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (typeof password !== "string") {
        return { valid: false, error: "Password must be a string" };
    }

    if (password.length < 8) {
        return { valid: false, error: "Password must be at least 8 characters long" };
    }

    if (password.length > 128) {
        return { valid: false, error: "Password must be less than 128 characters" };
    }

    // Check for at least one letter and one number
    if (!/[a-zA-Z]/.test(password)) {
        return { valid: false, error: "Password must contain at least one letter" };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, error: "Password must contain at least one number" };
    }

    return { valid: true };
}

/**
 * Validate organization name
 * @param name - Organization name to validate
 * @returns Validation result with error message if invalid
 */
export function validateOrgName(name: string): { valid: boolean; error?: string } {
    if (typeof name !== "string") {
        return { valid: false, error: "Organization name must be a string" };
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return { valid: false, error: "Organization name must be at least 2 characters" };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: "Organization name must be less than 100 characters" };
    }

    // Allow letters, numbers, spaces, and common punctuation
    if (!/^[a-zA-Z0-9\s\-_.&']+$/.test(trimmed)) {
        return { valid: false, error: "Organization name contains invalid characters" };
    }

    return { valid: true };
}

/**
 * Validate OTP code
 * @param code - OTP code to validate
 * @returns true if valid, false otherwise
 */
export function isValidOTP(code: string): boolean {
    if (typeof code !== "string") {
        return false;
    }

    // OTP should be exactly 6 digits
    return /^\d{6}$/.test(code.trim());
}

/**
 * Validate organization ID format
 * @param orgId - Organization ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidOrgId(orgId: string): boolean {
    if (typeof orgId !== "string") {
        return false;
    }

    // Org ID should be alphanumeric with hyphens, 2-50 characters
    return /^[a-z0-9-]{2,50}$/.test(orgId);
}

/**
 * Validate message/text content
 * @param message - Message to validate
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Validation result with error message if invalid
 */
export function validateMessage(
    message: string,
    maxLength: number = 5000
): { valid: boolean; error?: string; sanitized?: string } {
    if (typeof message !== "string") {
        return { valid: false, error: "Message must be a string" };
    }

    const trimmed = message.trim();

    if (trimmed.length === 0) {
        return { valid: true, sanitized: "" }; // Empty messages are allowed
    }

    if (trimmed.length > maxLength) {
        return { valid: false, error: `Message must be less than ${maxLength} characters` };
    }

    // Sanitize but allow basic formatting
    const sanitized = trimmed
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
        .replace(/javascript:/gi, "") // Remove javascript: protocol
        .slice(0, maxLength);

    return { valid: true, sanitized };
}

/**
 * Validate numeric ID
 * @param id - ID to validate
 * @returns true if valid positive integer, false otherwise
 */
export function isValidNumericId(id: any): boolean {
    const num = Number(id);
    return Number.isInteger(num) && num > 0;
}

/**
 * Validate UUID format
 * @param uuid - UUID to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(uuid: string): boolean {
    if (typeof uuid !== "string") {
        return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Sanitize SQL input (additional layer of protection)
 * Note: Always use parameterized queries as primary defense
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeSQLInput(input: string): string {
    if (typeof input !== "string") {
        return "";
    }

    // Remove common SQL injection patterns
    return input
        .replace(/['";\\]/g, "") // Remove quotes and backslashes
        .replace(/--/g, "") // Remove SQL comments
        .replace(/\/\*/g, "") // Remove multi-line comment start
        .replace(/\*\//g, "") // Remove multi-line comment end
        .replace(/xp_/gi, "") // Remove SQL Server extended procedures
        .replace(/sp_/gi, "") // Remove SQL Server stored procedures
        .trim();
}

/**
 * Validate request body structure
 * @param body - Request body to validate
 * @param requiredFields - Array of required field names
 * @returns Validation result with missing fields if invalid
 */
export function validateRequestBody(
    body: any,
    requiredFields: string[]
): { valid: boolean; missingFields?: string[] } {
    if (!body || typeof body !== "object") {
        return { valid: false, missingFields: requiredFields };
    }

    const missingFields = requiredFields.filter((field) => {
        return !(field in body) || body[field] === undefined || body[field] === null;
    });

    if (missingFields.length > 0) {
        return { valid: false, missingFields };
    }

    return { valid: true };
}

/**
 * Validate IP address format
 * @param ip - IP address to validate
 * @returns true if valid IPv4 or IPv6, false otherwise
 */
export function isValidIP(ip: string): boolean {
    if (typeof ip !== "string") {
        return false;
    }

    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
        const parts = ip.split(".");
        return parts.every((part) => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    }

    // IPv6 regex (simplified)
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    return ipv6Regex.test(ip);
}

/**
 * Comprehensive input validation for common scenarios
 */
export const Validators = {
    email: isValidEmail,
    password: validatePassword,
    orgName: validateOrgName,
    otp: isValidOTP,
    orgId: isValidOrgId,
    message: validateMessage,
    numericId: isValidNumericId,
    uuid: isValidUUID,
    ip: isValidIP,
    requestBody: validateRequestBody,
};

/**
 * Sanitizers for different input types
 */
export const Sanitizers = {
    string: sanitizeString,
    sql: sanitizeSQLInput,
};
