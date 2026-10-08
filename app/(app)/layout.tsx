import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Header from "@/components/layout/Header";
import SessionGuard from "@/components/layout/SessionGuard";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;

  if (!user || !user.isActive) redirect("/login");

  return (
    <>
      <SessionGuard />
      <Sidebar
        isAdmin={user.role === "ADMINISTRATOR" || user.role === "SUPERADMIN"}
        isSuperAdmin={user.role === "SUPERADMIN"}
        userName={user.fullName}
      />
      <SidebarLayout>
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-8 xl:max-w-7xl 2xl:max-w-[1800px]">
          {children}
        </main>
      </SidebarLayout>
    </>
  );
}