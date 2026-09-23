// prisma/seed-apprehensions.ts
//
// Imports the historical 2014–2026 apprehension records (parsed from the
// original consolidated spreadsheet) into the database.
//
// Usage:
//   1. Place apprehension_data.json in your prisma/ folder
//   2. Run: npx tsx prisma/seed-apprehensions.ts
//      (install tsx first if needed: npm install -D tsx)
//
// This is separate from your regular seed.ts (reference data like
// categories) so you can re-run it independently, and so accidentally
// re-running `prisma db seed` doesn't re-import 1,300+ records.

import { PrismaClient, ApprehensionStatus } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

type ParsedItem = {
  description: string | null;
  volumeCuM: number | null;
  estimatedValue: number | null;
};

type ParsedRecord = {
  dateOrPlaceRaw: string | null;
  date: string | null;
  place: string | null;
  circumstances: string | null;
  custodian: string | null;
  otherAgencies: string | null;
  conveyanceEquipment: string | null;
  remarks: string | null;
  items: ParsedItem[];
};

type ParsedYear = {
  cenros: Record<string, ParsedRecord[]>;
};

// Best-effort status classification from the free-text remarks.
// Everything else stays UNKNOWN until a records officer reviews it —
// do not treat this as legally authoritative on its own.
function classifyStatus(remarks: string | null): ApprehensionStatus {
  if (!remarks) return ApprehensionStatus.UNKNOWN;
  const r = remarks.toLowerCase();
  if (r.includes('donated')) return ApprehensionStatus.DONATED;
  if (r.includes('confiscated in favor')) return ApprehensionStatus.CONFISCATED;
  if (r.includes('released') || r.includes('returned to the owner')) return ApprehensionStatus.RELEASED;
  if (r.includes('under administrative adjudication')) return ApprehensionStatus.UNDER_ADJUDICATION;
  if (r.includes('for resolution') || r.includes('foresolution')) return ApprehensionStatus.FOR_RESOLUTION;
  return ApprehensionStatus.UNKNOWN;
}

// Best-effort docket number extraction, e.g. "Docket No. R2-F-1036" or "docket no. R2-ED-2024-0041"
function extractDocketNumber(remarks: string | null): string | null {
  if (!remarks) return null;
  const match = remarks.match(/docket\s*no\.?\s*([A-Z0-9-]+)/i);
  return match ? match[1] : null;
}

// Best-effort finality date extraction, e.g. "With Order of Finality received on Sept. 11, 2024"
function extractFinalityDate(remarks: string | null): string | null {
  if (!remarks) return null;
  const match = remarks.match(/order of finality (?:received|date received)[^.]*?on\s+([A-Za-z.]+\s+\d{1,2},?\s+\d{4})/i);
  return match ? match[1] : null;
}

async function main() {
  const dataPath = path.join(__dirname, 'apprehension_data.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data: Record<string, ParsedYear> = JSON.parse(raw);

  // Ensure all known CENRO offices exist
  const officeNames = ['APARRI', 'ALCALA', 'SOLANA', 'SANCHEZ MIRA', 'TUGUEGARAO', 'SUB OFFICE'];
  const officeMap = new Map<string, number>();
  for (const name of officeNames) {
    const office = await prisma.cenroOffice.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    officeMap.set(name, office.id);
  }

  let totalRecords = 0;
  let totalItems = 0;
  let skippedUnknownOffice = 0;

  for (const [year, yearData] of Object.entries(data)) {
    const yearNum = parseInt(year, 10);

    for (const [cenroName, records] of Object.entries(yearData.cenros)) {
      const officeId = officeMap.get(cenroName);
      if (!officeId) {
        console.warn(`Skipping unrecognized CENRO office "${cenroName}" (${records.length} records) — add it to officeNames if legitimate.`);
        skippedUnknownOffice += records.length;
        continue;
      }

      for (const rec of records) {
        const status = classifyStatus(rec.remarks);
        const docketNumber = extractDocketNumber(rec.remarks);
        const orderOfFinalityDate = extractFinalityDate(rec.remarks);

        const created = await prisma.apprehensionRecord.create({
          data: {
            cenroOfficeId: officeId,
            year: yearNum,
            dateOfApprehension: rec.date ?? rec.dateOrPlaceRaw ?? null,
            placeOfApprehension: rec.place ?? rec.dateOrPlaceRaw ?? null,
            circumstances: rec.circumstances,
            custodianLocation: rec.custodian,
            otherAgencies: rec.otherAgencies,
            conveyanceEquipment: rec.conveyanceEquipment,
            remarks: rec.remarks,
            status,
            docketNumber,
            orderOfFinalityDate,
            items: {
              create: rec.items.map((item) => ({
                description: item.description,
                volumeCuM: item.volumeCuM,
                estimatedValue: item.estimatedValue,
              })),
            },
          },
        });

        totalRecords += 1;
        totalItems += rec.items.length;
        void created;
      }
    }
  }

  console.log(`Imported ${totalRecords} apprehension records with ${totalItems} product line items.`);
  if (skippedUnknownOffice > 0) {
    console.warn(`${skippedUnknownOffice} records were skipped due to unrecognized CENRO office names — review the warnings above.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
