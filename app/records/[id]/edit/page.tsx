// FILE: app/records/[id]/edit/page.tsx  (replace the whole file)

import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
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

  const r = await prisma.apprehensionRecord.findUnique({
    where: { id: parseInt(id, 10) },
    include: { items: true, conveyances: true, equipment: true },
  });
  if (!r || r.isDeleted) notFound();

  const record = {
    id: r.id,
    dateOfApprehension: r.dateOfApprehension ?? "",
    placeOfApprehension: r.placeOfApprehension ?? "",
    apprehendingAgency: r.apprehendingAgency ?? "",
    claimantRespondent: r.claimantRespondent ?? "",
    circumstances: r.circumstances ?? "",
    custodianLocation: r.custodianLocation ?? "",
    otherAgencies: r.otherAgencies ?? "",
    remarks: r.remarks ?? "",
    items: r.items.map((i) => ({
      qty: i.quantity ?? "",
      species: i.species ?? "",
      forms: i.forms ?? i.description ?? "",
      bdft: i.volumeBdFt != null ? String(i.volumeBdFt) : "",
      cum: i.volumeCuM != null ? String(i.volumeCuM) : "",
      value: i.estimatedValue != null ? String(i.estimatedValue) : "",
    })),
    conveyances: r.conveyances.map((c) => ({
      type: c.type ?? "",
      qty: String(c.quantity),
      value: c.estimatedValue != null ? String(c.estimatedValue) : "",
    })),
    equipment: r.equipment.map((e) => ({
      type: e.type ?? "",
      qty: String(e.quantity),
      value: e.estimatedValue != null ? String(e.estimatedValue) : "",
    })),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit record #{r.id}</h1>
      <EditForm record={record} />
    </div>
  );
}
