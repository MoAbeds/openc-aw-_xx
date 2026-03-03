import type { Metadata } from "next";
import { Inter, Syne, DM_Mono } from "next/font/google";
import "./globals.css";
import { PWAHandler } from "@/components/PWAHandler";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
    title: "APEX OS | Agent Intelligence Platform",
    description: "Advanced multi-agent orchestration and deployment platform.",
    manifest: "/manifest.json",
    themeColor: "#080809",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "APEX OS",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
            </head>
            <body className={`${inter.variable} ${syne.variable} ${dmMono.variable} font-mono bg-background text-foreground overflow-x-hidden`}>
                <PWAHandler />
                {children}
            </body>
        </html>
    );
}
