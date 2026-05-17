import { SignJWT, jwtVerify } from "jose";

const getSecretKey = () => {
    const secret = process.env.JWT_SECRET || "fallback-secret-for-signing-cookies-123456789";
    return new TextEncoder().encode(secret);
};

export interface SessionPayload {
    email: string;
    orgId: string;
    orgName: string;
    [key: string]: any;
}

/**
 * Signs a session payload, returning a secure, tamper-proof JSON Web Token (JWT)
 */
export async function signSession(payload: SessionPayload): Promise<string> {
    return new SignJWT(payload as any)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getSecretKey());
}

/**
 * Verifies a signed JSON Web Token (JWT), returning the payload if valid or null if tampered with
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecretKey());
        return payload as SessionPayload;
    } catch (err) {
        return null;
    }
}
