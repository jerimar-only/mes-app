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
  const startMonth = parseInt(searchParams.get("startMonth") || "", 10);
  const endMonth = parseInt(searchParams.get("endMonth") || "", 10);
  if (!year || !startMonth || !endMonth || startMonth > endMonth) {
    return NextResponse.json({ error: "A valid year and month range are required." }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Summary");

  const columns = [
    { header: "Month", width: 14 },
    { header: "No. Incidents", width: 14 },
    { header: "Volume (BD. FT.)", width: 16 },
    { header: "No. of Conveyances", width: 18 },
    { header: "No. of Tool/Implements", width: 20 },
  ];
  const colCount = columns.length;

  sheet.mergeCells(1, 1, 1, colCount);
  const title = sheet.getCell(1, 1);
  title.value = `SUMMARY OF APPREHENSION COVERING ${MONTH_NAMES[startMonth].toUpperCase()} TO ${MONTH_NAMES[endMonth].toUpperCase()} ${year}`;
  title.font = { name: "Arial", bold: true, size: 13, color: { argb: "FF666666" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  const headerRowIdx = 3;
  columns.forEach((col, i) => {
    const cell = sheet.getCell(headerRowIdx, i + 1);
    cell.value = col.header;
    cell.font = { name: "Arial", bold: true, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB6D7A8" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getColumn(i + 1).width = col.width;
  });
  sheet.getRow(headerRowIdx).height = 32;

  let rowIdx = headerRowIdx + 1;
  let totalIncidents = 0, totalBdFt = 0, totalConv = 0, totalEquip = 0;

  for (let m = startMonth; m <= endMonth; m++) {
    const records = await prisma.apprehensionRecord.findMany({
      where: { year, month: m, isDeleted: false },
      include: { items: true, conveyances: true, equipment: true },
    });

    const incidents = records.length;
    const volumeBdFt = records.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + (i.volumeBdFt ?? 0), 0),
      0
    );
    const conveyances = records.reduce(
      (sum, r) => sum + r.conveyances.reduce((s, c) => s + c.quantity, 0),
      0
    );
    const equipment = records.reduce(
      (sum, r) => sum + r.equipment.reduce((s, e) => s + e.quantity, 0),
      0
    );

    const row = sheet.getRow(rowIdx);
    row.getCell(1).value = MONTH_NAMES[m].toUpperCase();
    row.getCell(2).value = incidents;
    row.getCell(3).value = volumeBdFt || null;
    row.getCell(4).value = conveyances;
    row.getCell(5).value = equipment;
    for (let c = 1; c <= colCount; c++) {
      row.getCell(c).font = { name: "Arial", size: 11 };
      row.getCell(c).alignment = { horizontal: "center" };
    }
    rowIdx += 1;

    totalIncidents += incidents;
    totalBdFt += volumeBdFt;
    totalConv += conveyances;
    totalEquip += equipment;
  }

  const totalRow = sheet.getRow(rowIdx);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(2).value = totalIncidents;
  totalRow.getCell(3).value = totalBdFt || null;
  totalRow.getCell(4).value = totalConv;
  totalRow.getCell(5).value = totalEquip;
  for (let c = 1; c <= colCount; c++) {
    totalRow.getCell(c).font = { name: "Arial", bold: true, size: 11 };
    totalRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    totalRow.getCell(c).alignment = { horizontal: "center" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Quarterly_Summary_${MONTH_NAMES[startMonth]}-${MONTH_NAMES[endMonth]}_${year}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
