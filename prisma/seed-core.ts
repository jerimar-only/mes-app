import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const OFFICES = [
  "CENRO APARRI",
  "CENRO ALCALA",
  "CENRO SOLANA",
  "CENRO SANCHEZ MIRA",
  "CENRO TUGUEGARAO",
  "SUB OFFICE",
];

const CUSTOM_FIELDS: { name: string; type: "TEXT" | "NUMBER"; order: number }[] = [
  { name: "ACP Endorsed to PENRO", type: "TEXT", order: 1 },
  { name: "ACP Endorsed to RO", type: "TEXT", order: 2 },
  { name: "Status of Case (Court/Prosecutor)", type: "TEXT", order: 3 },
  { name: "Notice of Order - Count", type: "NUMBER", order: 4 },
  { name: "Notice of Order - Decision", type: "TEXT", order: 5 },
  { name: "Appraisal", type: "TEXT", order: 6 },
  { name: "Condition of Forest Products", type: "TEXT", order: 7 },
  { name: "Disposition", type: "TEXT", order: 8 },

  // NEW -- added to capture 2023/2024/2025's "Order of Resolution",
  // "Order of Finality" (promulgated date), "Notice of Issuance" (docket
  // number), ACP-conducted date, and 2025's one-off status remark, none of
  // which had a FieldDefinition row yet.
  { name: "Date of ACP Conducted", type: "TEXT", order: 9 },
  { name: "Order of Resolution - Date Recorded", type: "TEXT", order: 10 },
  { name: "Order of Resolution - Docket Number", type: "TEXT", order: 11 },
  { name: "Order of Resolution - Date Promulgated", type: "TEXT", order: 12 },
  { name: "Order of Finality - Date Promulgated", type: "TEXT", order: 13 },
  { name: "Notice of Order - Docket Number", type: "TEXT", order: 14 },
  { name: "Notice of Issuance - Date Recorded", type: "TEXT", order: 15 }, // 2024 only -- see script comment
  { name: "Status of Forest Products", type: "TEXT", order: 16 },
];

async function main() {
  for (const name of OFFICES) {
    await prisma.cenroOffice.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const f of CUSTOM_FIELDS) {
    await prisma.fieldDefinition.upsert({
      where: { name: f.name },
      update: { type: f.type, order: f.order },
      create: f,
    });
  }
  console.log(`Seeded ${OFFICES.length} CENRO offices and ${CUSTOM_FIELDS.length} custom fields.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
