import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-at-least-32-chars-long";
const key = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
    const session = request.cookies.get("apex_session")?.value;

    // Protect /dashboard and all its subroutes
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        try {
            await jwtVerify(session, key);
            return NextResponse.next();
        } catch (err) {
            console.warn("Invalid session cookie. Redirecting to login.");
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("apex_session");
            return response;
        }
    }

    // Redirect / to /dashboard if logged in, else let it be (layout handles it)
    if (request.nextUrl.pathname === "/") {
        if (session) {
            try {
                await jwtVerify(session, key);
                return NextResponse.redirect(new URL("/dashboard", request.url));
            } catch (e) {
                return NextResponse.next();
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
