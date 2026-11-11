import { prisma } from "@/lib/prisma";
import { createRecord } from "../records/actions";
import NewRecordForm from "./NewRecordForm";
import { getOfficeScope } from "@/lib/officeScope";
import { redirect } from "next/navigation";

export default async function NewRecordPage() {
  const scope = await getOfficeScope();
  if (!scope) redirect("/login");

  const [allOffices, penroOfficesRaw, penroOfficers, cenroOfficers] =
    await Promise.all([
      prisma.cenroOffice.findMany({
        orderBy: { name: "asc" },
        include: {
          penroOffice: { select: { id: true, name: true } },
          defaultOfficer: { select: { id: true, name: true } },
        },
      }),
      prisma.penroOffice.findMany({
        orderBy: { name: "asc" },
        include: {
          defaultOfficer: { select: { id: true, name: true } },
        },
      }),
      prisma.penroOfficer.findMany({ orderBy: { name: "asc" } }),
      prisma.cenroOfficer.findMany({ orderBy: { name: "asc" } }),
    ]);

  const scoped = scope.allowedOfficeIds
    ? allOffices.filter((o) => scope.allowedOfficeIds!.includes(o.id))
    : allOffices;

  const offices = scoped.map((o) => ({
    id: o.id,
    name: o.name,
    penroOfficeId: o.penroOfficeId,
    penroOfficeName: o.penroOffice?.name ?? null,
    defaultOfficerName: o.defaultOfficer?.name ?? null,
  }));

  const penroOffices = penroOfficesRaw.map((p) => ({
    id: p.id,
    name: p.name,
    defaultOfficerName: p.defaultOfficer?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <NewRecordForm
        offices={offices}
        penroOffices={penroOffices}
        penroOfficers={penroOfficers}
        cenroOfficers={cenroOfficers}
        action={createRecord}
        lockedOfficeId={scope.isCenro ? scope.officeId : null}
      />
    </div>
  );
}
