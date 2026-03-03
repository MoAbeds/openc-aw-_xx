import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex bg-background">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 relative overflow-y-auto">
                {/* Subtle background decoration */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-accent-teal/5 blur-[120px] pointer-events-none rounded-full" />
                <div className="fixed bottom-0 left-64 w-[300px] h-[300px] bg-accent-purple/5 blur-[100px] pointer-events-none rounded-full" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
