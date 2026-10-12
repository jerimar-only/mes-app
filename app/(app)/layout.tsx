import { redirect } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Header from "@/components/layout/Header";
import SessionGuard from "@/components/layout/SessionGuard";
import AppProviders from "@/components/layout/AppProviders";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;

  // No user or deactivated → clear cookie then login (avoids infinite redirect)
  if (!user || !user.isActive) {
    await clearSession();
    redirect("/login");
  }

  return (
    <AppProviders>
      <SessionGuard />
      <Sidebar
        isAdmin={user.role === "ADMINISTRATOR" || user.role === "SUPERADMIN"}
        isSuperAdmin={user.role === "SUPERADMIN"}
        userName={user.fullName}
      />
      <SidebarLayout>
        <Header />
        <main className="app-main mx-auto max-w-6xl px-5 py-7 sm:px-6 sm:py-8 xl:max-w-7xl 2xl:max-w-[1800px]">
          {children}
        </main>
      </SidebarLayout>
    </AppProviders>
  );
}