import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getOfficeScope } from "@/lib/officeScope";
import { permissions } from "@/lib/permissions";
import { buildRecordWhere, type RecordFilterParams } from "@/lib/recordFilters";

export const maxDuration = 60;

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!permissions.exportExcel(session.role)) {
    return new Response("Export to Excel is limited to the Regional Office and Super Admin.", { status: 403 });
  }
  const scope = await getOfficeScope();
  if (!scope) return new Response("Unauthorized", { status: 401 });

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
    where: buildRecordWhere(params, scope.allowedOfficeIds),
    include: { cenroOffice: true, items: true, conveyances: true, equipment: true },
    orderBy: [{ year: "desc" }, { id: "desc" }],
    take: 10000,
  });

  const yn = (v: boolean | null) => (v === null || v === undefined ? "" : v ? "Yes" : "No");
  const MONTHS = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Columns follow the Log new apprehension form (Drive links are at the end).
  const rows = records.map((r) => ({
    ID: r.id,
    "PENRO office": r.penroOffice ?? "",
    "PENRO officer": r.penroOfficer ?? "",
    "CENRO office": r.cenroOffice.name,
    "CENRO officer": r.cenroOfficer ?? "",
    Year: r.year,
    Month: r.month ? MONTHS[r.month] : "",
    "Date of apprehension": r.dateOfApprehension ?? "",
    "Time of apprehension": r.timeOfApprehension ?? "",
    "Place of apprehension": r.placeOfApprehension ?? "",
    "GPS coordinates": r.gpsCoordinates ?? "",
    "Forest products": r.items
      .map((i) =>
        [i.type || i.forms, i.species, i.description, i.quantity ? `${i.quantity} pcs` : ""]
          .filter(Boolean)
          .join(" ") || "item",
      )
      .join("; "),
    "Volume (cu.m.)": r.items.reduce((s, i) => s + (i.volumeCuM ?? 0), 0),
    "Volume (bd.ft.)": r.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0),
    "Estimated value": r.items.reduce((s, i) => s + (i.estimatedValue ?? 0), 0),
    Conveyances: r.conveyances
      .map((c) => `${c.type ?? ""}${c.plateNo ? ` (${c.plateNo})` : ""} x${c.quantity}`.trim())
      .join("; "),
    "Conveyances est. value": r.conveyances.reduce((s, c) => s + (c.estimatedValue ?? 0), 0),
    Equipment: r.equipment.map((e) => `${e.type ?? ""} x${e.quantity}`.trim()).join("; "),
    "Equipment est. value": r.equipment.reduce((s, e) => s + (e.estimatedValue ?? 0), 0),
    "Apprehending agency": r.apprehendingAgency ?? "",
    "Apprehending officer": r.apprehendingOfficer ?? "",
    "Claimant/owner": r.claimantRespondent ?? "",
    "Respondent address": r.respondentAddress ?? "",
    "Respondent contact": r.respondentContact ?? "",
    "ACP conducted": yn(r.acpConducted),
    "ACP date": iso(r.acpDate),
    "ACP endorsed to PENRO": iso(r.acpEndorsedToPenro),
    "ACP endorsed to RO": iso(r.acpEndorsedToRo),
    "Date of promulgation": r.dateOfPromulgation ?? "",
    "Promulgated by": r.promulgatedBy ?? "",
    "Docket number": r.docketNumber ?? "",
    "Order of finality date": r.orderOfFinalityDate ?? "",
    "Appraisal conducted - forest products": yn(r.appraisalForestProducts),
    "Appraisal date - forest products": iso(r.appraisalForestProductsDate),
    "Appraisal conducted - conveyances": yn(r.appraisalConveyances),
    "Appraisal date - conveyances": iso(r.appraisalConveyancesDate),
    "Appraisal conducted - equipment": yn(r.appraisalEquipment),
    "Appraisal date - equipment": iso(r.appraisalEquipmentDate),
    "Donation made": yn(r.donationMade),
    "Donation FP date": r.donationFpDate ?? "",
    "Donation FP donor": r.donationFpDonor ?? "",
    "Donation FP donee": r.donationFpDonee ?? "",
    "Donation FP volume": r.donationFpVolume ?? "",
    "Donation conveyance date": r.donationConvDate ?? "",
    "Donation conveyance donor": r.donationConvDonor ?? "",
    "Donation conveyance donee": r.donationConvDonee ?? "",
    "Donation equipment date": r.donationEquipDate ?? "",
    "Donation equipment donor": r.donationEquipDonor ?? "",
    "Donation equipment donee": r.donationEquipDonee ?? "",
    "Source of forest products": r.sourcePlace ?? "",
    "Land classification": r.landClassification ?? "",
    "Place impounded": r.custodianLocation ?? "",
    "Other agencies": r.otherAgencies ?? "",
    Remarks: r.remarks ?? r.circumstances ?? "",
    "Other remarks": r.otherRemarks ?? "",
    "Case status": r.caseStatus ?? "",
    Status: r.status,
    Deleted: r.isDeleted ? "Yes" : "No",
    "Case documents (Drive link)": r.caseDocumentsUrl ?? "",
    "Appraisal report (Drive link)": r.appraisalReportUrl ?? "",
    "Deed of donation (Drive link)": r.deedOfDonationUrl ?? "",
    "Terminal report (Drive link)": r.terminalReportUrl ?? "",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  const headerKeys = rows.length ? Object.keys(rows[0]) : [];
  // Make the Drive links clickable and give every column a readable width
  sheet["!cols"] = headerKeys.map((h) => ({
    wch: h.includes("Drive link") ? 48 : Math.min(Math.max(h.length + 2, 14), 40),
  }));
  headerKeys.forEach((h, c) => {
    if (!h.includes("Drive link")) return;
    rows.forEach((row, i) => {
      const url = (row as Record<string, unknown>)[h] as string;
      if (!url) return;
      const cell = sheet[XLSX.utils.encode_cell({ r: i + 1, c })];
      if (cell) cell.l = { Target: url, Tooltip: "Open in Google Drive" };
    });
  });
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