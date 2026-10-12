import { redirect } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isActive: true },
    });
    if (user?.isActive) {
      redirect("/dashboard");
    }
    // Stale session (deactivated / deleted user) — drop cookie so we don't loop
    await clearSession();
  }
  return <LoginForm />;
}