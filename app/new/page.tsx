import { prisma } from "@/lib/prisma";
import { createRecord } from "../records/actions";
import NewRecordForm from "./NewRecordForm";

export default async function NewRecordPage() {
  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log new apprehension</h1>
        <p className="mt-1 text-[15px] text-[#5B6156]">
          Record a new apprehension, seizure, or confiscation.
        </p>
      </div>
      <NewRecordForm offices={offices} action={createRecord} />
    </div>
  );
}
