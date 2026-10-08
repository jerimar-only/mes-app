import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildRecordWhere, type RecordFilterParams } from "@/lib/recordFilters";

export const maxDuration = 60;

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const sp = new URL(req.url).searchParams;
  const params: RecordFilterParams = {
    q: sp.get("q") ?? undefined,
    year: sp.get("year") ?? undefined,
    office: sp.get("office") ?? undefined,
    status: sp.get("status") ?? undefined,
    deleted: sp.get("deleted") ?? undefined,
    acp: sp.get("acp") ?? undefined,
    conv: sp.get("conv") ?? undefined,
    resolved: sp.get("resolved") ?? undefined,
  };

  const records = await prisma.apprehensionRecord.findMany({
    where: buildRecordWhere(params),
    include: { cenroOffice: true, items: true, conveyances: true, equipment: true },
    orderBy: [{ year: "desc" }, { id: "desc" }],
    take: 10000,
  });

  const rows = records.map((r) => ({
    ID: r.id,
    "CENRO office": r.cenroOffice.name,
    Year: r.year,
    Month: r.month ?? "",
    "Date of apprehension": r.dateOfApprehension ?? "",
    "Place of apprehension": r.placeOfApprehension ?? "",
    "Source of forest products": r.sourcePlace ?? "",
    "GPS coordinates": r.gpsCoordinates ?? "",
    "Land classification": r.landClassification ?? "",
    "Apprehending officers": r.apprehendingAgency ?? "",
    "Claimant/owner": r.claimantRespondent ?? "",
    Circumstances: r.circumstances ?? "",
    "Place impounded": r.custodianLocation ?? "",
    "Other agencies": r.otherAgencies ?? "",
    "Forest products": r.items
      .map((i) => i.species || i.forms || i.description || "item")
      .join("; "),
    "Volume (cu.m.)": r.items.reduce((s, i) => s + (i.volumeCuM ?? 0), 0),
    "Volume (bd.ft.)": r.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0),
    "Estimated value": r.items.reduce((s, i) => s + (i.estimatedValue ?? 0), 0),
    Conveyances: r.conveyances.map((c) => `${c.type} x${c.quantity}`).join("; "),
    Equipment: r.equipment.map((e) => `${e.type} x${e.quantity}`).join("; "),
    "Other remarks": r.otherRemarks ?? "",
    Remarks: r.remarks ?? "",
    "ACP endorsed to PENRO": iso(r.acpEndorsedToPenro),
    "ACP endorsed to RO": iso(r.acpEndorsedToRo),
    "Case status": r.caseStatus ?? "",
    Status: r.status,
    "Docket number": r.docketNumber ?? "",
    "Order of finality date": r.orderOfFinalityDate ?? "",
    Deleted: r.isDeleted ? "Yes" : "No",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Records");
  const buf: Buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="apprehension-records-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}