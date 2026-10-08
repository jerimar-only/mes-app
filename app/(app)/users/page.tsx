import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getSession();

  // Only Super Admin can manage users → send them to Admin Portal
  if (session?.role === "SUPERADMIN") {
    redirect("/adminportal");
  }

  // Everyone else → dashboard
  redirect("/dashboard");
}