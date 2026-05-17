import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "./app/lib/auth";

const PROTECTED_PATHS = ["/dashboard", "/transfer", "/inbox"];
const AUTH_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
    const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

    const token = request.cookies.get("session")?.value;
    const session = token ? await verifySession(token) : null;

    // Redirect unauthenticated users away from protected routes
    if (isProtected && !session) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect already-authenticated users away from the login/signup page
    if (isAuthPage && session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/transfer/:path*", "/inbox/:path*", "/login", "/signup"],
};
