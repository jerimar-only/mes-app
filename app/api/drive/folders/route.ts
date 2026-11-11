/**
 * GET    /api/drive/folders          → list all folder mappings (SA only)
 * POST   /api/drive/folders          → create / update a folder mapping (SA only)
 * DELETE /api/drive/folders?id=123   → soft-deactivate mapping (SA only)
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { getPermissions } from "@/lib/permissions";
import {
  listDriveFolders,
  upsertDriveFolder,
} from "@/lib/driveFolders";
import { FolderType } from "@prisma/client";
import { extractFolderId } from "@/lib/drive";

async function requireSuperAdmin() {
  const user = await getAuthUser();
  if (!user || !user.isActive) return null;
  const perms = getPermissions(user);
  if (!perms.canManageFolders) return null;
  return user;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const folders = await listDriveFolders();
  return NextResponse.json(folders);
}

export async function POST(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    id,
    name,
    driveId: driveIdRaw,
    type,
    penroOfficeId,
    cenroOfficeId,
    parentId,
    isActive,
  } = body;

  if (!name || !driveIdRaw || !type) {
    return NextResponse.json(
      { error: "name, driveId and type are required" },
      { status: 400 },
    );
  }

  if (!Object.values(FolderType).includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Accept full Drive URL or bare folder ID
  const driveId = extractFolderId(String(driveIdRaw));

  const folder = await upsertDriveFolder({
    id: id ? Number(id) : undefined,
    name: String(name),
    driveId,
    type,
    penroOfficeId: penroOfficeId ? Number(penroOfficeId) : null,
    cenroOfficeId: cenroOfficeId ? Number(cenroOfficeId) : null,
    parentId: parentId ? Number(parentId) : null,
    isActive: isActive !== false,
  });

  return NextResponse.json(folder, { status: id ? 200 : 201 });
}

export async function DELETE(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.driveFolder.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
