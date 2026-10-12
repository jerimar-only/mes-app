import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isActive: true },
    });
    // Only send active users to the app. Do not clear cookies here —
    // Server Components cannot modify cookies (causes 500 on Vercel).
    // Stale/deactivated sessions are cleared in /api/session or the login action.
    if (user?.isActive) {
      redirect("/dashboard");
    }
  }
  return <LoginForm />;
}
