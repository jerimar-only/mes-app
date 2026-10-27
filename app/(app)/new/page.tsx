import { prisma } from "@/lib/prisma";
import { createRecord } from "../records/actions";
import NewRecordForm from "./NewRecordForm";

export default async function NewRecordPage() {
  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <NewRecordForm offices={offices} action={createRecord} />
    </div>
  );
}
