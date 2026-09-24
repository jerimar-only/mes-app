"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import * as XLSX from "xlsx";

const VALID_OFFICES = ["APARRI", "ALCALA", "SOLANA", "SANCHEZ MIRA", "TUGUEGARAO", "SUB OFFICE"];

type RowResult = { row: number; ok: boolean; message: string };

export async function uploadExcel(formData: FormData): Promise<{
  imported: number;
  errors: RowResult[];
}> {
  const session = await getSession();
  if (!session || !permissions.uploadExcel(session.role as Role)) {
    throw new Error("You don't have permission to upload records.");
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    throw new Error("No file was uploaded.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const dataRows = rows.slice(1);

  const officeCache = new Map<string, number>();
  for (const name of VALID_OFFICES) {
    const office = await prisma.cenroOffice.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    officeCache.set(name, office.id);
  }

  const results: RowResult[] = [];
  let imported = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const row = dataRows[i];
    if (!row || row.every((cell) => cell === null || cell === "")) continue;

    const [
      officeName, year, month, dateOfApprehension, placeOfApprehension,
      apprehendingAgency, claimantRespondent, circumstances, custodianLocation,
      otherAgencies, remarks,
      itemQty, itemSpecies, itemForms, itemVolumeBdFt, itemVolumeCuM, itemValue,
      convType, convQty,
      equipType, equipQty,
    ] = row;

    const normalizedOffice = String(officeName ?? "").trim().toUpperCase();
    if (!VALID_OFFICES.includes(normalizedOffice)) {
      results.push({ row: rowNum, ok: false, message: `Invalid CENRO Office "${officeName}".` });
      continue;
    }

    const yearNum = parseInt(String(year), 10);
    if (!yearNum || yearNum < 2000 || yearNum > 2100) {
      results.push({ row: rowNum, ok: false, message: `Invalid Year "${year}".` });
      continue;
    }

    const monthNum = month ? parseInt(String(month), 10) : null;
    if (monthNum !== null && (monthNum < 1 || monthNum > 12)) {
      results.push({ row: rowNum, ok: false, message: `Invalid Month "${month}" \u2014 must be 1\u201312.` });
      continue;
    }

    try {
      const hasItem = itemQty || itemSpecies || itemForms || itemVolumeBdFt || itemVolumeCuM || itemValue;
      const hasConv = convType;
      const hasEquip = equipType;

      await prisma.apprehensionRecord.create({
        data: {
          cenroOfficeId: officeCache.get(normalizedOffice)!,
          year: yearNum,
          month: monthNum,
          dateOfApprehension: dateOfApprehension ? String(dateOfApprehension) : null,
          placeOfApprehension: placeOfApprehension ? String(placeOfApprehension) : null,
          apprehendingAgency: apprehendingAgency ? String(apprehendingAgency) : null,
          claimantRespondent: claimantRespondent ? String(claimantRespondent) : null,
          circumstances: circumstances ? String(circumstances) : null,
          custodianLocation: custodianLocation ? String(custodianLocation) : null,
          otherAgencies: otherAgencies ? String(otherAgencies) : null,
          remarks: remarks ? String(remarks) : null,
          status: "UNKNOWN",
          items: hasItem
            ? {
                create: [{
                  quantity: itemQty ? String(itemQty) : null,
                  species: itemSpecies ? String(itemSpecies) : null,
                  forms: itemForms ? String(itemForms) : null,
                  volumeBdFt: itemVolumeBdFt ? parseFloat(String(itemVolumeBdFt)) : null,
                  volumeCuM: itemVolumeCuM ? parseFloat(String(itemVolumeCuM)) : null,
                  estimatedValue: itemValue ? parseFloat(String(itemValue)) : null,
                }],
              }
            : undefined,
          conveyances: hasConv
            ? { create: [{ type: String(convType), quantity: convQty ? parseInt(String(convQty), 10) : 1 }] }
            : undefined,
          equipment: hasEquip
            ? { create: [{ type: String(equipType), quantity: equipQty ? parseInt(String(equipQty), 10) : 1 }] }
            : undefined,
        },
      });
      imported += 1;
      results.push({ row: rowNum, ok: true, message: "Imported." });
    } catch (e) {
      results.push({ row: rowNum, ok: false, message: "Database error while saving this row." });
    }
  }

  return { imported, errors: results.filter((r) => !r.ok) };
}
