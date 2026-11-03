import { prisma } from "@/lib/prisma";
import { createRecord } from "../records/actions";
import NewRecordForm from "./NewRecordForm";
import { getOfficeScope } from "@/lib/officeScope";
import { redirect } from "next/navigation";

export default async function NewRecordPage() {
  const scope = await getOfficeScope();
  if (!scope) redirect("/login");

  const allOffices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });
  const offices =
    scope.isCenro && scope.officeId
      ? allOffices.filter((o) => o.id === scope.officeId)
      : allOffices;

  return (
    <div className="space-y-6">
      <NewRecordForm
        offices={offices}
        action={createRecord}
        lockedOfficeId={scope.isCenro ? scope.officeId : null}
      />
    </div>
  );
}
