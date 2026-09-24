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

  // rows[0] is the header row — skip it. Skip the example row (row 2) only if it's
  // clearly still the shipped example (CENRO = APARRI, Year = 2026, place contains "Burubur").
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
    const rowNum = i + 2; // actual spreadsheet row number (1-indexed, header is row 1)
    const row = dataRows[i];
    if (!row || row.every((cell) => cell === null || cell === "")) continue;

    const [
      officeName,
      year,
      dateOfApprehension,
      placeOfApprehension,
      circumstances,
      custodianLocation,
      otherAgencies,
      conveyanceEquipment,
      remarks,
      itemDescription,
      volumeCuM,
      estimatedValue,
    ] = row;

    const normalizedOffice = String(officeName ?? "").trim().toUpperCase();
    if (!VALID_OFFICES.includes(normalizedOffice)) {
      results.push({
        row: rowNum,
        ok: false,
        message: `Invalid CENRO Office "${officeName}". Must be one of: ${VALID_OFFICES.join(", ")}.`,
      });
      continue;
    }

    const yearNum = parseInt(String(year), 10);
    if (!yearNum || yearNum < 2000 || yearNum > 2100) {
      results.push({ row: rowNum, ok: false, message: `Invalid Year "${year}".` });
      continue;
    }

    try {
      await prisma.apprehensionRecord.create({
        data: {
          cenroOfficeId: officeCache.get(normalizedOffice)!,
          year: yearNum,
          dateOfApprehension: dateOfApprehension ? String(dateOfApprehension) : null,
          placeOfApprehension: placeOfApprehension ? String(placeOfApprehension) : null,
          circumstances: circumstances ? String(circumstances) : null,
          custodianLocation: custodianLocation ? String(custodianLocation) : null,
          otherAgencies: otherAgencies ? String(otherAgencies) : null,
          conveyanceEquipment: conveyanceEquipment ? String(conveyanceEquipment) : null,
          remarks: remarks ? String(remarks) : null,
          status: "UNKNOWN",
          items: itemDescription || volumeCuM || estimatedValue
            ? {
                create: [
                  {
                    description: itemDescription ? String(itemDescription) : null,
                    volumeCuM: volumeCuM ? parseFloat(String(volumeCuM)) : null,
                    estimatedValue: estimatedValue ? parseFloat(String(estimatedValue)) : null,
                  },
                ],
              }
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
