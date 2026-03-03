"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-at-least-32-chars-long";
const key = new TextEncoder().encode(JWT_SECRET);

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.message || "Authentication failed" };
        }

        // Set HTTP-only cookie
        cookies().set("apex_session", data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return { success: true };
    } catch (err) {
        return { error: "Failed to connect to authentication server" };
    }
}

export async function register(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.message || "Registration failed" };
        }

        // Set cookie
        cookies().set("apex_session", data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
        });

        return { success: true };
    } catch (err) {
        return { error: "Failed to connect to authentication server" };
    }
}

export async function logout() {
    cookies().delete("apex_session");
    redirect("/login");
}

export async function getSession() {
    const session = cookies().get("apex_session")?.value;
    if (!session) return null;

    try {
        const { payload } = await jwtVerify(session, key);
        return payload;
    } catch (err) {
        return null;
    }
}
