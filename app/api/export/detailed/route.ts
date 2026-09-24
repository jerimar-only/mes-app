import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import ExcelJS from "exceljs";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !permissions.printRecords(session.role as Role)) {
    return NextResponse.json({ error: "You don't have permission to export records." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || "", 10);
  const month = parseInt(searchParams.get("month") || "", 10);
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "A valid year and month are required." }, { status: 400 });
  }

  const offices = await prisma.cenroOffice.findMany({ orderBy: { name: "asc" } });
  const records = await prisma.apprehensionRecord.findMany({
    where: { year, month, isDeleted: false },
    include: { items: true, conveyances: true, equipment: true, cenroOffice: true },
    orderBy: [{ cenroOfficeId: "asc" }, { id: "asc" }],
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${MONTH_NAMES[month]} ${year}`);

  const columns = [
    { header: "CENR Office", width: 16 },
    { header: "No. of Incidents", width: 10 },
    { header: "Date of Apprehension", width: 16 },
    { header: "Place of Apprehension", width: 26 },
    { header: "Apprehending Agency/s", width: 20 },
    { header: "Name of Claimant/Respondent", width: 26 },
    { header: "Qty.", width: 8 },
    { header: "Species", width: 16 },
    { header: "Forms", width: 18 },
    { header: "Volume (BDFT)", width: 14 },
    { header: "Conveyance Type", width: 16 },
    { header: "Conveyance Qty", width: 10 },
    { header: "Equipment/Tool Type", width: 20 },
    { header: "Equipment Qty", width: 10 },
  ];
  const colCount = columns.length;

  sheet.mergeCells(1, 1, 1, colCount);
  const title = sheet.getCell(1, 1);
  title.value = `DETAILED REPORT ON APPREHENSION OF APPREHENDED FOREST PRODUCTS, TOOLS AND EQUIPMENT FOR THE MONTH OF ${MONTH_NAMES[month].toUpperCase()} ${year}`;
  title.font = { name: "Arial", bold: true, size: 12 };
  title.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 34;

  const headerRowIdx = 3;
  columns.forEach((col, i) => {
    const cell = sheet.getCell(headerRowIdx, i + 1);
    cell.value = col.header;
    cell.font = { name: "Arial", bold: true, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB6D7A8" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getColumn(i + 1).width = col.width;
  });
  sheet.getRow(headerRowIdx).height = 28;

  let rowIdx = headerRowIdx + 1;
  let grandIncidents = 0, grandQty = 0, grandBdFt = 0, grandConv = 0, grandEquip = 0;

  for (const office of offices) {
    const officeRecords = records.filter((r) => r.cenroOfficeId === office.id);

    if (officeRecords.length === 0) {
      const row = sheet.getRow(rowIdx);
      row.getCell(1).value = office.name;
      for (let c = 2; c <= colCount; c++) row.getCell(c).value = "-";
      rowIdx += 1;
    } else {
      let officeQty = 0, officeBdFt = 0, officeConv = 0, officeEquip = 0;

      for (const record of officeRecords) {
        const lines = Math.max(record.items.length, record.conveyances.length, record.equipment.length, 1);
        for (let i = 0; i < lines; i++) {
          const row = sheet.getRow(rowIdx);
          if (i === 0) {
            row.getCell(1).value = office.name;
            row.getCell(2).value = 1;
            row.getCell(3).value = record.dateOfApprehension;
            row.getCell(4).value = record.placeOfApprehension;
            row.getCell(5).value = record.apprehendingAgency;
            row.getCell(6).value = record.claimantRespondent;
          }
          const item = record.items[i];
          if (item) {
            row.getCell(7).value = item.quantity;
            row.getCell(8).value = item.species;
            row.getCell(9).value = item.forms;
            row.getCell(10).value = item.volumeBdFt;
            officeBdFt += item.volumeBdFt ?? 0;
            const qtyNum = parseFloat(String(item.quantity ?? "").replace(/[^0-9.]/g, ""));
            if (!isNaN(qtyNum)) officeQty += qtyNum;
          }
          const conv = record.conveyances[i];
          if (conv) {
            row.getCell(11).value = conv.type;
            row.getCell(12).value = conv.quantity;
            officeConv += conv.quantity;
          }
          const eq = record.equipment[i];
          if (eq) {
            row.getCell(13).value = eq.type;
            row.getCell(14).value = eq.quantity;
            officeEquip += eq.quantity;
          }
          for (let c = 1; c <= colCount; c++) {
            row.getCell(c).font = { name: "Arial", size: 10 };
            row.getCell(c).alignment = { vertical: "top", wrapText: true };
          }
          rowIdx += 1;
        }
      }

      const subtotalRow = sheet.getRow(rowIdx);
      subtotalRow.getCell(1).value = "Sub-Total";
      subtotalRow.getCell(2).value = officeRecords.length;
      subtotalRow.getCell(7).value = officeQty || null;
      subtotalRow.getCell(10).value = officeBdFt || null;
      subtotalRow.getCell(12).value = officeConv || null;
      subtotalRow.getCell(14).value = officeEquip || null;
      for (let c = 1; c <= colCount; c++) {
        subtotalRow.getCell(c).font = { name: "Arial", bold: true, size: 10 };
        subtotalRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
      }
      rowIdx += 1;

      grandIncidents += officeRecords.length;
      grandQty += officeQty;
      grandBdFt += officeBdFt;
      grandConv += officeConv;
      grandEquip += officeEquip;
    }
  }

  const totalRow = sheet.getRow(rowIdx);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(2).value = grandIncidents;
  totalRow.getCell(7).value = grandQty || null;
  totalRow.getCell(10).value = grandBdFt || null;
  totalRow.getCell(12).value = grandConv || null;
  totalRow.getCell(14).value = grandEquip || null;
  for (let c = 1; c <= colCount; c++) {
    totalRow.getCell(c).font = { name: "Arial", bold: true, size: 11 };
    totalRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Detailed_Report_${MONTH_NAMES[month]}_${year}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
