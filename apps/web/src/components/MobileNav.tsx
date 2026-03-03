"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Terminal,
    Settings,
    Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
    { label: "Fleet", href: "/dashboard", icon: LayoutDashboard },
    { label: "Logs", href: "/dashboard/logs", icon: Terminal },
    { label: "Activity", href: "/dashboard/activity", icon: Activity },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 z-50 md:hidden pb-safe">
            {mobileItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href as any}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200",
                            active ? "text-accent-teal" : "text-muted hover:text-foreground"
                        )}
                    >
                        <div className={cn(
                            "p-1 rounded-lg transition-all",
                            active && "bg-accent-teal/10 shadow-[0_0_15px_rgba(0,255,209,0.2)]"
                        )}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                        {active && (
                            <div className="absolute top-0 w-8 h-0.5 bg-accent-teal shadow-[0_0_10px_rgba(0,255,209,0.5)] rounded-full" />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
