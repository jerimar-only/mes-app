/**
 * GET  /api/records/[id]/comments  → list comments
 * POST /api/records/[id]/comments  → add comment
 *
 * REGIONAL (and all other authenticated roles) can add comments.
 * Edit/delete of records is still blocked for REGIONAL via canEdit/canDelete.
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import {
  canAccessRecord,
  getPermissions,
  type AuthUser,
} from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getAuthUser();

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const recordId = Number(id);

  const record = await prisma.apprehensionRecord.findFirst({
    where: { id: recordId, isDeleted: false },
    select: { id: true, cenroOfficeId: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canAccessRecord(user, record.cenroOfficeId, "view");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comments = await prisma.recordComment.findMany({
    where: { apprehensionRecordId: recordId },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: Params) {
  const user = await getAuthUser();

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(user);
  if (!perms.canComment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const recordId = Number(id);
  const body = await req.json();
  const content = (body.content || "").trim();

  if (!content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const record = await prisma.apprehensionRecord.findFirst({
    where: { id: recordId, isDeleted: false },
    select: { id: true, cenroOfficeId: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canAccessRecord(user, record.cenroOfficeId, "view");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.recordComment.create({
    data: {
      apprehensionRecordId: recordId,
      userId: user.id,
      content,
    },
    include: {
      user: { select: { id: true, fullName: true, role: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
