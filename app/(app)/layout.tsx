import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SessionGuard from "@/components/layout/SessionGuard";
import ScrollUnlock from "@/components/layout/ScrollUnlock";
import AppProviders from "@/components/layout/AppProviders";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          fullName: true,
          role: true,
          isActive: true,
          cenroOfficeId: true,
          cenroOffice: { select: { name: true } },
        },
      })
    : null;

  if (!user || !user.isActive) {
    redirect("/login");
  }

  // CENRO accounts must have an assigned office
  if (user.role === "CENRO" && !user.cenroOfficeId) {
    redirect("/login");
  }

  const isCenro = user.role === "CENRO";
  const isAdmin =
    user.role === "ADMINISTRATOR" || user.role === "SUPERADMIN";
  const isSuperAdmin = user.role === "SUPERADMIN";
  // Bulk edit/delete: SA, Administrator, PENRO admin, CENRO admin, CENRO portal
  const canBulk = [
    "SUPERADMIN",
    "ADMINISTRATOR",
    "PENRO_ADMIN",
    "CENRO_ADMIN",
    "CENRO",
  ].includes(user.role);

  return (
    <AppProviders>
      <SessionGuard />
      <ScrollUnlock />
      <Sidebar
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        isCenro={isCenro}
        canBulk={canBulk}
        userName={user.fullName}
        officeName={user.cenroOffice?.name ?? null}
      />
      <SidebarLayout>
        <Header />
        <main className="app-main mx-auto w-full max-w-6xl px-4 pt-2 pb-6 sm:px-5 sm:pt-3 sm:pb-8 xl:max-w-7xl 2xl:max-w-[1800px]">
          {children}
        </main>
        <Footer />
      </SidebarLayout>
    </AppProviders>
  );
}
