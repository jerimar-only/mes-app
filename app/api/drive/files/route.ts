/**
 * GET    /api/drive/files?folderId=xxx   → list files in a Drive folder (SA only)
 * DELETE /api/drive/files?fileId=xxx     → delete a file in Drive (SA only)
 */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/currentUser";
import { getPermissions } from "@/lib/permissions";
import { authedClient } from "@/lib/googleSettings";
import { listFolderFiles, deleteDriveFile, extractFolderId } from "@/lib/drive";

async function requireSuperAdmin() {
  const user = await getAuthUser();
  if (!user || !user.isActive) return null;
  if (!getPermissions(user).canManageFolders) return null;
  return user;
}

export async function GET(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("folderId") || "";
  if (!raw) {
    return NextResponse.json({ error: "folderId required" }, { status: 400 });
  }

  const folderId = extractFolderId(raw);
  const auth = await authedClient();
  if (!auth) {
    return NextResponse.json(
      { error: "Google Drive is not connected. Connect it in Settings." },
      { status: 400 },
    );
  }

  try {
    const files = await listFolderFiles(auth, folderId);
    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to list files" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const user = await requireSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId") || "";
  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  const auth = await authedClient();
  if (!auth) {
    return NextResponse.json(
      { error: "Google Drive is not connected. Connect it in Settings." },
      { status: 400 },
    );
  }

  try {
    await deleteDriveFile(auth, fileId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to delete file" },
      { status: 500 },
    );
  }
}
