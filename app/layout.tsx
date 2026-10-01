import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BurgerMenu from "./BurgerMenu";
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

            <header className="border-b border-[var(--border-strong)] bg-[var(--header)]">
              <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
                <BurgerMenu
                  isAdmin={user.role === "ADMINISTRATOR"}
                  userName={user.fullName}
                />
                <Link
                  href="/dashboard"
                  className="text-[15px] font-semibold tracking-tight text-[var(--header-text)]"
                >
                  EMS Apprehension Tracker
                </Link>

                <div className="ml-auto">
                  <ThemeToggle />
                </div>
              </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-10">
              {children}
            </main>
          </>
        ) : (
          // Login page - no header, no padding
          children
        )}
      </body>
    </html>
  );
}