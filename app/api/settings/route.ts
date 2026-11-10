import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extractFolderId } from "@/lib/drive";
import {
  DOC_TYPES,
  folderSettingKey,
  isDocType,
} from "@/lib/driveFolders";
import {
  deleteSetting,
  getSetting,
  googleConfigured,
  setSetting,
} from "@/lib/googleSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[\w-]{10,}$/;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folders: Record<string, string | null> = {};
  for (const d of DOC_TYPES) {
    folders[d.key] = await getSetting(folderSettingKey(d.key));
  }

  return NextResponse.json({
    parentFolderId: await getSetting("parentFolderId"),
    folders,
    googleConfigured: googleConfigured(),
    googleConnected: Boolean(await getSetting("googleTokens")),
  });
}

/**
 * Save a Drive folder (accepts Drive URL or ID). SUPERADMIN only.
 *   { parentFolder }            → general fallback folder
 *   { docType, folder }         → folder for one document type
 *   { docType, folder: "" }     → clear that type's folder (falls back to parent)
 */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    parentFolder?: string;
    docType?: string;
    folder?: string;
  };

  // Per-document-type folder
  if (body.docType !== undefined) {
    if (!isDocType(body.docType)) {
      return NextResponse.json({ error: "Unknown document type" }, { status: 400 });
    }
    const raw = (body.folder ?? "").trim();
    if (!raw) {
      await deleteSetting(folderSettingKey(body.docType));
      return NextResponse.json({ docType: body.docType, folderId: null });
    }
    const id = extractFolderId(raw);
    if (!ID_RE.test(id)) {
      return NextResponse.json(
        { error: "That does not look like a Drive folder link or ID" },
        { status: 400 }
      );
    }
    await setSetting(folderSettingKey(body.docType), id);
    return NextResponse.json({ docType: body.docType, folderId: id });
  }

  // General parent folder (fallback)
  const id = extractFolderId(body.parentFolder ?? "");
  if (!ID_RE.test(id)) {
    return NextResponse.json(
      { error: "That does not look like a Drive folder link or ID" },
      { status: 400 }
    );
  }
  await setSetting("parentFolderId", id);
  return NextResponse.json({ parentFolderId: id });
}

/** Disconnect Google (clear tokens). SUPERADMIN only. */
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await deleteSetting("googleTokens");
  return NextResponse.json({ ok: true });
}
