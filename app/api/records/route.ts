/**
 * GET /api/records
 * AOR-filtered list. Response: { records, total, page, totalPages, pageSize }
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { getAllowedCenroOfficeIds, narrowOfficeIds } from "@/lib/permissions";

export async function GET(req: Request) {
  const user = await getAuthUser();

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedOfficeIds = await getAllowedCenroOfficeIds(user);
  const { searchParams } = new URL(req.url);

  const year = searchParams.get("year");
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const office = searchParams.get("office");
  const deleted = searchParams.get("deleted");

  const pageRaw = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const pageSizeParam = searchParams.get("pageSize") ?? "25";
  const pageSize =
    pageSizeParam === "all"
      ? 500
      : Math.min(500, Math.max(1, parseInt(pageSizeParam, 10) || 25));

  // The requested office filter can only narrow, never widen, the user's area
  const requestedOffices = office
    ? office
        .split(",")
        .map((x) => parseInt(x, 10))
        .filter((n) => !Number.isNaN(n))
    : null;
  const officeIds = narrowOfficeIds(allowedOfficeIds, requestedOffices);

  const where: any = {
    ...(deleted === "only"
      ? { isDeleted: true }
      : deleted === "all"
        ? {}
        : { isDeleted: false }),
    ...(year ? { year: Number(year) } : {}),
    ...(status
      ? status === "DONATED"
        ? { status: { in: ["DONATED", "CONFISCATED", "RELEASED"] } }
        : status === "UNDER_ADJUDICATION"
          ? { status: { in: ["UNDER_ADJUDICATION", "UNKNOWN"] } }
          : { status: status as any }
      : {}),
    ...(officeIds ? { cenroOfficeId: { in: officeIds } } : {}),
    ...(q
      ? {
          OR: [
            { docketNumber: { contains: q, mode: "insensitive" } },
            { claimantRespondent: { contains: q, mode: "insensitive" } },
            { placeOfApprehension: { contains: q, mode: "insensitive" } },
            { sourcePlace: { contains: q, mode: "insensitive" } },
            { apprehendingAgency: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.apprehensionRecord.count({ where }),
    prisma.apprehensionRecord.findMany({
      where,
      include: {
        cenroOffice: { select: { id: true, name: true } },
        items: { select: { estimatedValue: true } },
        conveyances: { select: { estimatedValue: true } },
        equipment: { select: { estimatedValue: true } },
        _count: { select: { items: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const records = rows.map((r) => {
    const productsValue = r.items.reduce(
      (s, i) => s + (i.estimatedValue ?? 0),
      0,
    );
    const conveyancesValue = r.conveyances.reduce(
      (s, c) => s + (c.estimatedValue ?? 0),
      0,
    );
    const equipmentValue = r.equipment.reduce(
      (s, e) => s + (e.estimatedValue ?? 0),
      0,
    );
    return {
      id: r.id,
      year: r.year,
      placeOfApprehension: r.placeOfApprehension,
      dateOfApprehension: r.dateOfApprehension,
      docketNumber: r.docketNumber,
      status: r.status,
      createdAt: r.createdAt,
      cenroOffice: r.cenroOffice,
      _count: r._count,
      productsValue,
      conveyancesValue,
      equipmentValue,
      estimatedValue: productsValue + conveyancesValue + equipmentValue,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json({
    records,
    total,
    page,
    totalPages,
    pageSize,
  });
}
