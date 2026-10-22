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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk delete</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Select active records and mark them as deleted. Same soft-delete as the Delete button
          on a record page — they are hidden from the dashboard and reports, not removed from the
          database.
        </p>
      </div>
      <BulkDeleteClient />
    </div>
  );
}
