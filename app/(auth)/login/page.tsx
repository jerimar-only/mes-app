import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.isActive) redirect("/dashboard");
  }
  return <LoginForm />;
}