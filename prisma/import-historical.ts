/**
 * One-time historical importer: reads the master
 * "Consolidated_Yearly_Apprehension..." workbook and creates
 * ApprehensionRecord + ForestProductItem/Conveyance/Equipment (+ FieldValue
 * for the custom fields wired to FieldDefinition) rows for every year sheet
 * 2014-2026.
 *
 * v3 changes vs. v2:
 *   - FIXED A REAL BUG in 2024: `orderOfFinalityDate`/`docketNumber` were
 *     mapped to columns 20/21, which in the 2024 sheet are actually
 *     "Order of Resolution -> Date Promulgated" and
 *     "Order of Finality -> Date Recorded/Received" (a date, not a docket
 *     number!). 2024's header layout is shifted one column right of 2023's
 *     because of its extra "Order of Resolution/Notice of Issuance of an
 *     Order" merged label. Corrected to 21/22 (2024's actual
 *     Date Recorded/Received + Docket Number under "Order of Finality").
 *     2023 was already correct at 20/21 -- verified against real data.
 *   - 2025 is now fully mapped (previously left with 16-34 unmapped).
 *     Columns AB, AC, AD, AE, AF, AG, AH (Notice Decision, a standalone
 *     "Order of Finality" flag, Appraisal Yes/No, Condition Good/
 *     Deteriorated, Disposition) are legitimately EMPTY across the whole
 *     2025 sheet -- confirmed by scanning every row, not a parsing gap --
 *     so they're intentionally left out rather than mapped to nothing.
 *   - 2023 and 2024 now also capture their "Order of Resolution" data
 *     (date recorded / docket number / date promulgated), which existed in
 *     both sheets but was never captured before.
 *   - New custom fields route through the same FieldDefinition/FieldValue
 *     mechanism already used for 2026's Appraisal/Disposition/etc. -- no
 *     schema migration needed. Run the updated seed-core.ts BEFORE this
 *     script so the new FieldDefinition rows exist.
 *   - 2024 column Q (17, header "date recorded", ~51 rows populated) is
 *     mapped to a new "Notice of Issuance - Date Recorded" custom field.
 *     This is a best-guess label -- the header doesn't say what it's the
 *     recorded date OF, distinct from the Resolution group's own
 *     "Date Recorded/Received" three columns over. Spot-check this one.
 *
 * Confidence by year (see chat for details):
 *   Column layout verified against real data: all years.
 *   2019 legitimately only reports the APARRI office for that year in the
 *   source workbook -- not a parsing gap.
 *   NOT captured anywhere yet (flagged, not fixed, in this pass): 2023's
 *   "Chainsaw" count column (O, ~19 rows) has no home in the current
 *   mapping -- separate decision needed on where it should go.
 *
 * USAGE:
 *   Seed the new custom fields first (safe to re-run, upsert-based):
 *     npx tsx prisma/seed-core.ts
 *   Dry run (default, no DB writes):
 *     npx tsx prisma/import-historical.ts "./master.xlsx"
 *   Commit to DB:
 *     npx tsx prisma/import-historical.ts "./master.xlsx" --commit
 *   Import a single year only (handy for spot-checking):
 *     npx tsx prisma/import-historical.ts "./master.xlsx" --year 2025 --commit
 */

import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KNOWN_OFFICES = ["APARRI", "ALCALA", "SOLANA", "SANCHEZ MIRA", "TUGUEGARAO", "SUB OFFICE"];

type Cols = {
  no?: number;
  date?: number;
  place?: number;
  datePlace?: number; // combined "date & place" single column (classic era)
  circumstances?: number;
  apprehendingAgency?: number;
  claimant?: number;
  qtyForm?: number;
  description?: number; // free-text fallback (classic era: qty+species+forms all in one cell)
  volCuM?: number;
  volBdFt?: number;
  value?: number;
  conveyanceOrEquipment?: number; // single ambiguous column -- classified by keyword
  conveyanceOrEquipmentValue?: number;
  conveyanceQty?: number;
  conveyanceType?: number;
  conveyanceValue?: number;
  equipmentQty?: number;
  equipmentType?: number;
  equipmentValue?: number;
  custodian?: number;
  otherAgencies?: number;
  remarks?: number;
  remarks2?: number;
  docketNumber?: number;
  orderOfFinalityDate?: number;
  // custom fields (mapped to FieldDefinition by name; only populated for years that have them)
  acpToPenro?: number;
  acpToRo?: number;
  statusOfCase?: number;
  noticeCount?: number;
  noticeDecision?: number;
  appraisal?: number;
  conditionGood?: number;
  conditionDeteriorated?: number;
  disposition?: number;
  // NEW custom fields (v3)
  acpConductedDate?: number;
  resolutionDateRecorded?: number;
  resolutionDocketNumber?: number;
  resolutionDatePromulgated?: number;
  finalityDatePromulgated?: number;
  noticeDocketNumber?: number;
  noticeDateRecorded?: number; // 2024 only -- see file header comment
  statusOfForestProducts?: number;
};

type YearConfig = {
  combinedDatePlace?: boolean;
  cols: Cols;
  verified: boolean;
};

// 2014: has a leading "No." column, so everything is shifted one column
// right compared to 2015-2018.
const CLASSIC_1_2014: Cols = {
  no: 1,
  datePlace: 2,
  circumstances: 3,
  description: 4,
  volCuM: 5,
  value: 6,
  custodian: 7,
  otherAgencies: 8,
  remarks: 9,
};

// 2015-2018: same free-text "Date & Place" layout as 2014, but WITHOUT the
// leading "No." column -- confirmed identical across all four years against
// real sheet data.
const OLD_ERA_COLS: Cols = {
  datePlace: 1,
  circumstances: 2,
  qtyForm: 3,
  volCuM: 4,
  volBdFt: 5,
  value: 6,
  custodian: 7,
  otherAgencies: 8,
  remarks: 9,
};

const YEAR_CONFIGS: Record<string, YearConfig> = {
  "2014": { combinedDatePlace: true, cols: CLASSIC_1_2014, verified: true },
  "2015": { combinedDatePlace: true, cols: OLD_ERA_COLS, verified: true },
  "2016": { combinedDatePlace: true, cols: OLD_ERA_COLS, verified: true },
  "2017": { combinedDatePlace: true, cols: OLD_ERA_COLS, verified: true },
  "2018": { combinedDatePlace: true, cols: OLD_ERA_COLS, verified: true },
  "2019": {
    cols: { date: 1, place: 2, apprehendingAgency: 3, qtyForm: 4, volCuM: 5, value: 6, conveyanceOrEquipment: 7, custodian: 8, remarks: 9 },
    verified: true,
  },
  "2020": {
    cols: { date: 1, place: 2, apprehendingAgency: 3, qtyForm: 4, volCuM: 5, value: 6, conveyanceOrEquipment: 7, custodian: 8, remarks: 9 },
    verified: true,
  },
  "2021": {
    cols: { no: 1, date: 2, place: 3, apprehendingAgency: 4, qtyForm: 5, volCuM: 6, value: 7, conveyanceOrEquipment: 8, custodian: 9, remarks: 10 },
    verified: true,
  },
  "2022": {
    cols: {
      no: 1, date: 2, place: 3, apprehendingAgency: 4, qtyForm: 5, volCuM: 6, value: 8,
      conveyanceOrEquipment: 9, conveyanceOrEquipmentValue: 10, custodian: 11, remarks: 12,
    },
    verified: true,
  },
  "2023": {
    cols: {
      no: 1, date: 2, place: 3, apprehendingAgency: 4, claimant: 5, qtyForm: 6, volCuM: 7, volBdFt: 8, value: 9,
      conveyanceQty: 10, conveyanceOrEquipment: 11, custodian: 13, remarks: 14, remarks2: 23,
      // Order of Resolution: Q=17 (Date Recorded), R=18 (Docket Number), S=19 (Date Promulgated)
      acpConductedDate: 16,
      resolutionDateRecorded: 17, resolutionDocketNumber: 18, resolutionDatePromulgated: 19,
      // Order of Finality: T=20 (Date Recorded), U=21 (Docket Number), V=22 (Date Promulgated)
      orderOfFinalityDate: 20, docketNumber: 21, finalityDatePromulgated: 22,
    },
    verified: true,
  },
  "2024": {
    cols: {
      no: 1, date: 2, place: 3, apprehendingAgency: 4, claimant: 5, qtyForm: 6, volCuM: 7, volBdFt: 8, value: 9,
      conveyanceType: 10, equipmentType: 11, conveyanceValue: 12, equipmentValue: 12,
      custodian: 13, remarks: 14,
      acpConductedDate: 16,
      noticeDateRecorded: 17, // standalone "date recorded" col -- see file header comment
      // Order of Resolution/Notice of Issuance: R=18 (Date Recorded), S=19 (Docket Number), T=20 (Date Promulgated)
      resolutionDateRecorded: 18, resolutionDocketNumber: 19, resolutionDatePromulgated: 20,
      // Order of Finality: U=21 (Date Recorded), V=22 (Docket Number), W=23 (Date Promulgated)
      // FIXED (v3): was orderOfFinalityDate:20, docketNumber:21 -- pointed at
      // the wrong columns (Resolution's promulgated date, and a date instead
      // of a docket number). Corrected to 21/22.
      orderOfFinalityDate: 21, docketNumber: 22, finalityDatePromulgated: 23,
    },
    verified: true,
  },
  "2025": {
    cols: {
      no: 1, date: 2, place: 3, apprehendingAgency: 4, claimant: 5, qtyForm: 6, volCuM: 7, volBdFt: 8, value: 9,
      conveyanceType: 10, equipmentType: 11, conveyanceValue: 12, equipmentValue: 12,
      custodian: 13, remarks: 14,
      acpConductedDate: 16, // P -- only ~3 rows populated
      // Order of Resolution: R=18 (Date Recorded), S=19 (Docket Number), T=20 (Date Promulgated)
      resolutionDateRecorded: 18, resolutionDocketNumber: 19, resolutionDatePromulgated: 20,
      // Order of Finality: U=21 (Date Recorded), V=22 (Docket Number), X=24 (Date Promulgated; W=23 unused/empty)
      orderOfFinalityDate: 21, docketNumber: 22, finalityDatePromulgated: 24,
      statusOfForestProducts: 25, // Y -- free text, only 1 row populated this year
      // Notice of Issuance of Order: Z=26 (Count), AA=27 (Docket Number)
      noticeCount: 26, noticeDocketNumber: 27,
      // NOT mapped -- confirmed completely empty across the whole 2025 sheet:
      // AB (Notice Decision), AC (a standalone "Order of Finality" column),
      // AD/AE (Appraisal Yes/No), AF/AG (Condition Good/Deteriorated),
      // AH (Disposition).
    },
    verified: true,
  },
  "2026": {
    cols: {
      no: 1, date: 2, place: 3, apprehendingAgency: 4, claimant: 5, qtyForm: 6, volCuM: 7, volBdFt: 8, value: 9,
      conveyanceQty: 10, conveyanceType: 11, conveyanceValue: 12,
      equipmentQty: 13, equipmentType: 14, equipmentValue: 15,
      custodian: 16, remarks: 17, remarks2: 18,
      acpToPenro: 19, acpToRo: 20, statusOfCase: 21,
      noticeCount: 22, noticeDecision: 23, appraisal: 25,
      conditionGood: 27, conditionDeteriorated: 28, disposition: 29,
    },
    verified: true,
  },
};

const CUSTOM_FIELD_MAP: { col: keyof Cols; fieldName: string; type: "TEXT" | "NUMBER" }[] = [
  { col: "acpToPenro", fieldName: "ACP Endorsed to PENRO", type: "TEXT" },
  { col: "acpToRo", fieldName: "ACP Endorsed to RO", type: "TEXT" },
  { col: "statusOfCase", fieldName: "Status of Case (Court/Prosecutor)", type: "TEXT" },
  { col: "noticeCount", fieldName: "Notice of Order - Count", type: "NUMBER" },
  { col: "noticeDecision", fieldName: "Notice of Order - Decision", type: "TEXT" },
  { col: "appraisal", fieldName: "Appraisal", type: "TEXT" },
  { col: "disposition", fieldName: "Disposition", type: "TEXT" },
  // NEW (v3)
  { col: "acpConductedDate", fieldName: "Date of ACP Conducted", type: "TEXT" },
  { col: "resolutionDateRecorded", fieldName: "Order of Resolution - Date Recorded", type: "TEXT" },
  { col: "resolutionDocketNumber", fieldName: "Order of Resolution - Docket Number", type: "TEXT" },
  { col: "resolutionDatePromulgated", fieldName: "Order of Resolution - Date Promulgated", type: "TEXT" },
  { col: "finalityDatePromulgated", fieldName: "Order of Finality - Date Promulgated", type: "TEXT" },
  { col: "noticeDocketNumber", fieldName: "Notice of Order - Docket Number", type: "TEXT" },
  { col: "noticeDateRecorded", fieldName: "Notice of Issuance - Date Recorded", type: "TEXT" },
  { col: "statusOfForestProducts", fieldName: "Status of Forest Products", type: "TEXT" },
];

function cellText(v: any): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" });
  // ExcelJS represents formula cells as { formula, result }
  if (typeof v === "object" && v !== null && "result" in v) return cellText((v as any).result);
  const s = String(v).trim();
  return s.length ? s : null;
}
function cellNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object" && v !== null && "result" in v) return cellNumber((v as any).result);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Strips any of "CENRO ", "DENR-CENRO ", "DENR CENRO ", "CENR OFFICE - ",
// "CENR OFFICE ", "CENR " prefixes, normalizes hyphens to spaces and
// collapses whitespace, then checks the result against the known office
// names. Returns null for anything that isn't an EXACT match -- this is
// what keeps it from false-matching on descriptive text like
// "CENRO Aparri Compound" or "CENRO Alcala Personnel" (those have extra
// words after the office name and won't match exactly).
function normOffice(text: string): string | null {
  let t = text.toUpperCase().trim();
  t = t.replace(/^(DENR[-\s]?)?CENR[O]?\s*(OFFICE)?\s*-?\s*/, "");
  t = t.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return KNOWN_OFFICES.includes(t) ? t : null;
}

// Checks columns A and B (both are used as the office-header column across
// different years/rows -- see file header comment) for a normalized office
// match. Returns the matched office name, or null if this isn't a header row.
function detectOfficeHeader(rawValues: any[]): string | null {
  for (const idx of [0, 1]) {
    const t = cellText(rawValues[idx]);
    if (t) {
      const norm = normOffice(t);
      if (norm) return norm;
    }
  }
  return null;
}

function isSkippableRow(values: any[]): boolean {
  const joined = values.filter((v) => v != null).map((v) => cellText(v) ?? "").join(" ").toUpperCase();
  if (!joined.trim()) return true;
  if (/\bSUB[\s-]?TOTAL\b/.test(joined) || /^TOTAL\b/.test(joined.trim())) return true;
  if (joined.includes("NOT INCLUDED")) return true;
  return false;
}
function classifyConveyanceOrEquipment(text: string): "equipment" | "conveyance" {
  return /chainsaw|equipment|tool|saw\b/i.test(text) ? "equipment" : "conveyance";
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find((a) => !a.startsWith("--"));
  const commit = args.includes("--commit");
  const yearArgIdx = args.indexOf("--year");
  const onlyYear = yearArgIdx >= 0 ? args[yearArgIdx + 1] : null;

  if (!filePath) {
    console.error("Usage: npx tsx prisma/import-historical.ts <path-to-master.xlsx> [--commit] [--year 2026]");
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const offices = await prisma.cenroOffice.findMany();
  const officeByName = new Map(offices.map((o) => [o.name.toUpperCase().replace(/^CENRO\s+/, "").trim(), o]));

  const fieldDefs = await prisma.fieldDefinition.findMany();
  const fieldDefByName = new Map(fieldDefs.map((f) => [f.name, f]));

  const summary: Record<string, { records: number; items: number; skipped: number; offices: Set<string> }> = {};

  for (const [year, config] of Object.entries(YEAR_CONFIGS)) {
    if (onlyYear && year !== onlyYear) continue;
    const ws = wb.getWorksheet(year);
    if (!ws) {
      console.log(`Sheet "${year}" not found -- skipping.`);
      continue;
    }

    summary[year] = { records: 0, items: 0, skipped: 0, offices: new Set() };
    let currentOfficeName: string | null = null;
    let lastRecordId: number | null = null; // for --commit mode continuation rows

    // eachRow with includeEmpty visits every row in the used range regardless
    // of whether the workbook's dimension metadata is accurate.
    const rowNumbers: number[] = [];
    ws.eachRow({ includeEmpty: true }, (_row, rowNumber) => rowNumbers.push(rowNumber));
    const maxRow = rowNumbers.length ? Math.max(...rowNumbers) : 0;

    for (let r = 1; r <= maxRow; r++) {
      const row = ws.getRow(r);
      const rawValues: any[] = [];
      for (let c = 1; c <= 35; c++) rawValues.push(row.getCell(c).value);

      const officeHit = detectOfficeHeader(rawValues);
      if (officeHit) {
        currentOfficeName = officeHit;
        summary[year].offices.add(officeHit);
        lastRecordId = null; // don't let a continuation-row check bleed across office sections
        continue;
      }

      if (isSkippableRow(rawValues)) { summary[year].skipped++; continue; }

      const cols = config.cols;
      const get = (key: keyof Cols) => (cols[key] ? rawValues[cols[key]! - 1] : undefined);

      const dateVal = config.combinedDatePlace ? get("datePlace") : get("date");
      const dateText = cellText(dateVal);
      const qtyFormText = cellText(get("qtyForm")) ?? cellText(get("description"));
      const isContinuationRow = !dateText && qtyFormText && lastRecordId !== null;

      if (!dateText && !qtyFormText) { summary[year].skipped++; continue; }

      if (!currentOfficeName) { summary[year].skipped++; continue; } // no office context yet, can't file it safely

      const office = officeByName.get(currentOfficeName);
      if (!office) { summary[year].skipped++; continue; }

      let recordId: number | null = lastRecordId;

      if (!isContinuationRow) {
        let dateOfApprehension: string | null = null;
        let placeOfApprehension: string | null = null;

        if (config.combinedDatePlace) {
          const combined = dateText ?? "";
          const slashIdx = combined.indexOf("/");
          if (slashIdx >= 0) {
            dateOfApprehension = combined.slice(0, slashIdx).trim();
            placeOfApprehension = combined.slice(slashIdx + 1).trim();
          } else {
            dateOfApprehension = combined || null;
          }
        } else {
          dateOfApprehension = dateText;
          placeOfApprehension = cellText(get("place"));
        }

        const circumstances = cellText(get("circumstances"));
        const apprehendingAgency = cellText(get("apprehendingAgency"));
        const claimant = cellText(get("claimant"));
        const custodian = cellText(get("custodian"));
        const otherAgencies = cellText(get("otherAgencies"));
        const remarksParts = [cellText(get("remarks")), cellText(get("remarks2"))].filter(Boolean);
        const remarks = remarksParts.length ? remarksParts.join(" | ") : null;
        const docketNumber = cellText(get("docketNumber"));
        const orderOfFinalityDate = cellText(get("orderOfFinalityDate"));

        let month: number | null = null;
        if (dateVal instanceof Date) month = dateVal.getMonth() + 1;

        summary[year].records++;

        if (commit) {
          const rec = await prisma.apprehensionRecord.create({
            data: {
              cenroOfficeId: office.id,
              year: Number(year),
              month,
              dateOfApprehension,
              placeOfApprehension,
              circumstances,
              apprehendingAgency,
              claimantRespondent: claimant,
              custodianLocation: custodian,
              otherAgencies,
              remarks,
              docketNumber,
              orderOfFinalityDate,
            },
          });
          recordId = rec.id;
          lastRecordId = rec.id;

          // Custom fields
          for (const cf of CUSTOM_FIELD_MAP) {
            const colIdx = cols[cf.col];
            if (!colIdx) continue;
            const raw = rawValues[colIdx - 1];
            const fd = fieldDefByName.get(cf.fieldName);
            if (!fd) continue;
            if (cf.type === "NUMBER") {
              const n = cellNumber(raw);
              if (n !== null) {
                await prisma.fieldValue.create({ data: { apprehensionRecordId: rec.id, fieldDefinitionId: fd.id, numberValue: n } });
              }
            } else {
              const t = cellText(raw);
              if (t !== null) {
                await prisma.fieldValue.create({ data: { apprehensionRecordId: rec.id, fieldDefinitionId: fd.id, textValue: t } });
              }
            }
          }
        } else {
          lastRecordId = -1; // dummy id so continuation-row counting still works in dry run
        }
      }

      // Forest product item
      const volCuM = cellNumber(get("volCuM"));
      const volBdFt = cellNumber(get("volBdFt"));
      const value = cellNumber(get("value"));
      if (qtyFormText || volCuM !== null || volBdFt !== null || value !== null) {
        summary[year].items++;
        if (commit && recordId !== null && recordId !== -1) {
          await prisma.forestProductItem.create({
            data: {
              apprehensionRecordId: recordId,
              description: config.cols.description ? qtyFormText : null,
              quantity: config.cols.description ? null : qtyFormText,
              volumeCuM: volCuM,
              volumeBdFt: volBdFt,
              estimatedValue: value,
            },
          });
        }
      }

      // Conveyance / Equipment
      if (!isContinuationRow && commit && recordId !== null && recordId !== -1) {
        if (cols.conveyanceOrEquipment) {
          const text = cellText(get("conveyanceOrEquipment"));
          const val = cellNumber(get("conveyanceOrEquipmentValue"));
          if (text) {
            const kind = classifyConveyanceOrEquipment(text);
            if (kind === "equipment") {
              await prisma.equipment.create({ data: { apprehensionRecordId: recordId, type: text, quantity: 1 } });
            } else {
              await prisma.conveyance.create({ data: { apprehensionRecordId: recordId, type: text, quantity: 1 } });
            }
          }
        }
        const conveyanceType = cellText(get("conveyanceType"));
        if (conveyanceType) {
          await prisma.conveyance.create({
            data: { apprehensionRecordId: recordId, type: conveyanceType, quantity: cellNumber(get("conveyanceQty")) ?? 1 },
          });
        }
        const equipmentType = cellText(get("equipmentType"));
        if (equipmentType) {
          await prisma.equipment.create({
            data: { apprehensionRecordId: recordId, type: equipmentType, quantity: cellNumber(get("equipmentQty")) ?? 1 },
          });
        }
      }
    }
  }

  console.log(`\n${commit ? "COMMITTED" : "DRY RUN (no DB writes)"}\n${"=".repeat(40)}`);
  for (const [year, s] of Object.entries(summary)) {
    const cfg = YEAR_CONFIGS[year];
    console.log(
      `${year} [${cfg.verified ? "verified" : "UNVERIFIED - spot check"}]: ` +
      `${s.records} records, ${s.items} items, ${s.skipped} rows skipped, offices seen: ${[...s.offices].join(", ") || "none"}`
    );
  }
  if (!commit) console.log(`\nRun again with --commit once this looks right.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
