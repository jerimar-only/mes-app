/**
 * POST /api/records/bulk-delete
 * Body: { ids: number[] }
 * Soft-deletes only the records the current user is allowed to touch (AOR-scoped).
 * Allowed roles: SUPERADMIN, ADMINISTRATOR, PENRO_ADMIN, CENRO_ADMIN
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import {
  buildAorWhere,
  getPermissions,
  type AuthUser,
} from "@/lib/permissions";

export async function POST(req: Request) {
  const user = await getAuthUser();

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(user);
  if (!perms.canBulk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const ids: number[] = Array.isArray(body.ids)
    ? body.ids.map(Number).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

  const aorWhere = await buildAorWhere(user);

  const result = await prisma.apprehensionRecord.updateMany({
    where: {
      id: { in: ids },
      isDeleted: false,
      ...aorWhere,
    },
    data: { isDeleted: true },
  });

  return NextResponse.json({
    deleted: result.count,
    requested: ids.length,
  });
}
