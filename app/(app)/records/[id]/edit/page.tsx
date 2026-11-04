import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { getRecordForEdit } from "../../actions";
import { EditForm } from "./EditForm";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    redirect(`/records/${id}`);
  }

  const record = await getRecordForEdit(parseInt(id, 10));
  if (!record) notFound();

  return (
    <div className="space-y-6">
      <p className="text-[14px] text-[var(--muted)]">Record #{record.id}</p>
      <EditForm record={record} />
    </div>
  );
}
