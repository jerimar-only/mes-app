import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BurgerMenu from "./BurgerMenu";
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
    <html lang="en">
      <body className="min-h-screen bg-[#F7F5F0] text-[#1F2A1E] antialiased">
        {user && (
          <header className="border-b border-[#D8D3C4] bg-[#1F2A1E]">
            <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
              <BurgerMenu isAdmin={user.role === "ADMINISTRATOR"} userName={user.fullName} />
              <Link href="/dashboard" className="text-[15px] font-semibold tracking-tight text-[#F7F5F0]">
                EMS Apprehension Tracker
              </Link>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
