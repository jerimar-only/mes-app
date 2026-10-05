import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "./Sidebar";
import InactivityLogout from "./InactivityLogout";
import ThemeToggle from "./ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMS Apprehension Tracker",
  description:
    "Monitoring system for apprehended, seized, and confiscated forest products — Province of Cagayan",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {user ? (
          <>
            <InactivityLogout />

            {/* Left Sidebar */}
            <Sidebar
              isAdmin={user.role === "ADMINISTRATOR"}
              userName={user.fullName}
            />

            {/* Main content area (shifted right) */}
            <div className="pl-64">
              {/* Top bar with theme toggle only */}
              <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-white/10 bg-black/30 px-6 backdrop-blur-xl">
                <ThemeToggle />
              </header>

              <main className="mx-auto max-w-6xl px-6 py-8">
                {children}
              </main>
            </div>
          </>
        ) : (
          // Login page - full screen, no sidebar
          children
        )}
      </body>
    </html>
  );
}