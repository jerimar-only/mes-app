import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import BulkUpdateClient from "./BulkUpdateClient";

export default async function BulkUpdatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!permissions.editSavedRecord(session.role as Role)) {
    redirect("/records");
  }

  return (
    <div className="space-y-6">
      <BulkUpdateClient />
    </div>
  );
}
