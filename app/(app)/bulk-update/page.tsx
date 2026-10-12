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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk update from Excel</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Upload a spreadsheet with record IDs, review changes in the table, then apply updates.
        </p>
      </div>
      <BulkUpdateClient />
    </div>
  );
}
