import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import SidebarLayout from "@/components/layout/SidebarLayout";
import InactivityLogout from "@/components/layout/InactivityLogout";
import Header from "@/components/layout/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMS Apprehension Tracker",
  description:
    "Monitoring system for apprehended, seized, and confiscated forest products — Province of Cagayan",
  icons: {
    icon: "/seal.png",
    shortcut: "/seal.png",
    apple: "/seal.png",
  },
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

            <Sidebar
              isAdmin={user.role === "ADMINISTRATOR"}
              userName={user.fullName}
            />

            <SidebarLayout>
              <Header />

              <main className="mx-auto max-w-6xl px-6 py-8">
                {children}
              </main>
            </SidebarLayout>
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}