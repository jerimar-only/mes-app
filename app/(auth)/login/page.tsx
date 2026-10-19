import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientInfo } from "@/lib/get-ip";
import { getLockedUntilByIp } from "./actions";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isActive: true },
    });
    // Only send active users to the app. Do not clear cookies here —
    // Server Components cannot modify cookies (causes 500 on Vercel).
    if (user?.isActive) {
      redirect("/dashboard");
    }
  }

  // IP-based lock: show timer on load / refresh without needing another submit
  const { ip } = await getClientInfo();
  const lockedUntil = await getLockedUntilByIp(ip);

  return (
    <LoginForm
      initialLockedUntil={lockedUntil ?? undefined}
    />
  );
}
