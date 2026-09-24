import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import ExcelJS from "exceljs";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under administrative adjudication",
  CONFISCATED: "Confiscated in favor of the government",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "For review",
};

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !permissions.printRecords(session.role as Role)) {
    return NextResponse.json({ error: "You don't have permission to export records." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const officeId = searchParams.get("office");

  if (!year || !officeId) {
    return NextResponse.json({ error: "Year and CENRO office are required." }, { status: 400 });
  }

  const office = await prisma.cenroOffice.findUnique({ where: { id: parseInt(officeId, 10) } });
  if (!office) {
    return NextResponse.json({ error: "CENRO office not found." }, { status: 404 });
  }

  const records = await prisma.apprehensionRecord.findMany({
    where: { year: parseInt(year, 10), cenroOfficeId: office.id, isDeleted: false },
    include: { items: true },
    orderBy: { id: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(String(year));

  const columns = [
    { header: "No.", width: 6 },
    { header: "Date & Place of Apprehension/Seizure/Confiscation", width: 32 },
    { header: "Circumstances of Apprehension/Seizure/Confiscation", width: 30 },
    { header: "Description of Forest Products (Quantity/Form)", width: 30 },
    { header: "Volume (cu.m.)", width: 14 },
    { header: "Estimated Market Value (PhP)", width: 18 },
    { header: "Place Stockpiled and Custodian", width: 26 },
    { header: "Other Agencies Involved", width: 20 },
    { header: "Status / Remarks", width: 30 },
  ];
  const colCount = columns.length;

  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "CONSOLIDATED YEARLY APPREHENSION FOR MONITORING OF NOTICE OF FINALITY AND RESOLUTION";
  titleCell.font = { name: "Arial", bold: true, size: 13 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, colCount);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = `CENRO ${office.name} \u2014 ${year}`;
  subtitleCell.font = { name: "Arial", bold: true, size: 11 };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

  const headerRowIdx = 4;
  columns.forEach((col, i) => {
    const cell = sheet.getCell(headerRowIdx, i + 1);
    cell.value = col.header;
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A6741" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getColumn(i + 1).width = col.width;
  });
  sheet.getRow(headerRowIdx).height = 34;

  let rowIdx = headerRowIdx + 1;
  let recordNo = 1;

  for (const record of records) {
    const items = record.items.length > 0 ? record.items : [{ description: null, volumeCuM: null, estimatedValue: null, id: 0, apprehensionRecordId: record.id }];
    const remarksText = [
      STATUS_LABEL[record.status] ?? record.status,
      record.docketNumber ? `Docket No. ${record.docketNumber}` : null,
      record.orderOfFinalityDate ? `Order of Finality: ${record.orderOfFinalityDate}` : null,
      record.remarks,
    ].filter(Boolean).join(" \u2014 ");

    items.forEach((item, idx) => {
      const row = sheet.getRow(rowIdx);
      if (idx === 0) {
        row.getCell(1).value = recordNo;
        row.getCell(2).value = [record.dateOfApprehension, record.placeOfApprehension].filter(Boolean).join(" / ") || null;
        row.getCell(3).value = record.circumstances;
        row.getCell(7).value = record.custodianLocation;
        row.getCell(8).value = record.otherAgencies;
        row.getCell(9).value = remarksText || null;
      }
      row.getCell(4).value = item.description;
      row.getCell(5).value = item.volumeCuM;
      row.getCell(6).value = item.estimatedValue;
      for (let c = 1; c <= colCount; c++) {
        row.getCell(c).font = { name: "Arial", size: 10 };
        row.getCell(c).alignment = { vertical: "top", wrapText: true };
        row.getCell(c).border = { bottom: { style: "thin", color: { argb: "FFE9E5D8" } } };
      }
      rowIdx += 1;
    });
    recordNo += 1;
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const filename = `Apprehensions_${office.name.replace(/\s+/g, "-")}_${year}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
