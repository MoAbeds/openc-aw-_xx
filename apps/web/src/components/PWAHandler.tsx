"use client";

import { useEffect } from "react";
import { subscribeToPush } from "@/lib/push";

export function PWAHandler() {
    useEffect(() => {
        // Register push on mount (first visit after login)
        const token = localStorage.getItem("apex_token");
        if (token) {
            subscribeToPush();
        }
    }, []);

    return null;
}
