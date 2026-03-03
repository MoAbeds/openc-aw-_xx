"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Cpu,
    Settings,
    PlusCircle,
    Terminal,
    LogOut,
    ShieldAlert,
    BookOpen,
    Users,
    Workflow,
    CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const navItems = [
    { label: "Fleet Monitor", href: "/dashboard", icon: LayoutDashboard },
    { label: "Agent Builder", href: "/dashboard/builder", icon: PlusCircle },
    { label: "Course to Agent", href: "/dashboard/course-builder", icon: BookOpen },
    { label: "Global Logs", href: "/dashboard/logs", icon: Terminal },
    { label: "Workflows", href: "/dashboard/workflows", icon: Workflow },
    { label: "Clients", href: "/dashboard/clients", icon: Users },
    { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);

    return (
        <div className="w-64 h-screen bg-surface border-r border-border hidden md:flex flex-col fixed left-0 top-0 z-50">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-accent-teal rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,255,209,0.3)]">
                        <Cpu className="text-background w-5 h-5" />
                    </div>
                    <h1 className="text-xl font-display font-bold tracking-wider italic">APEX OS</h1>
                </div>

                <WorkspaceSwitcher />

                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href as any}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm",
                                    active
                                        ? "bg-accent-teal/10 text-accent-teal border border-accent-teal/20"
                                        : "text-muted hover:text-foreground hover:bg-surface-secondary"
                                )}
                            >
                                <Icon className={cn("w-4 h-4", active ? "text-accent-teal" : "text-muted group-hover:text-foreground")} />
                                <span className="font-medium tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4 border-t border-border bg-black/20">
                <div className="flex items-center gap-3 px-3 py-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-surface-secondary border border-border flex items-center justify-center overflow-hidden">
                        {user?.avatarUrl ? <img src={user.avatarUrl} alt="avatar" /> : <div className="w-full h-full bg-accent-purple/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                        <p className="text-xs text-muted truncate lowercase">{user?.role || "Operator"}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted hover:text-accent-orange hover:bg-accent-orange/10 transition-colors text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Terminate Session</span>
                </button>
            </div>
        </div>
    );
}
