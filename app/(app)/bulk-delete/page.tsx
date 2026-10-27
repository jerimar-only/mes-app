import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import BulkDeleteClient from "./BulkDeleteClient";

export default async function BulkDeletePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!permissions.editSavedRecord(session.role as Role)) {
    redirect("/records");
  }

  return (
    <div className="space-y-6">
      <BulkDeleteClient />
    </div>
  );
}
