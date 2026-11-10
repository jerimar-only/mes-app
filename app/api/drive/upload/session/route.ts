import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { startResumableSession, createFolder } from "@/lib/drive";
import { isDocType, resolveFolder } from "@/lib/driveFolders";
import { authedClient } from "@/lib/googleSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Step 1 of a direct-to-Drive upload. PDF only.
 * Body (JSON): { name, mimeType, size, docType, caseLabel? }
 * Returns:     { uploadUrl, folderId }
 *
 * The destination folder is chosen on the server from the Super Admin's
 * Folder Settings for `docType` (falling back to the general parent folder);
 * the browser cannot pick a folder.
 *
 * No file bytes are sent here, so the Vercel request-body limit (~4.5 MB)
 * does not apply. The browser PUTs the file to `uploadUrl` itself.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = session.role as Role;
  if (!permissions.createRecord(role) && !permissions.editSavedRecord(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = await authedClient();
  if (!auth) {
    return NextResponse.json(
      {
        error:
          "Google Drive is not connected. Ask a Super Admin to connect it in Settings.",
      },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    mimeType?: string;
    size?: number;
    docType?: string;
    caseLabel?: string;
  } | null;

  const name = String(body?.name ?? "").trim();
  const mime = String(body?.mimeType ?? "").trim();
  const size = Number(body?.size);
  const caseLabel = String(body?.caseLabel ?? "").trim();
  const docType = body?.docType ?? "caseDocuments";

  if (!isDocType(docType)) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "No file name" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 50 MB)" },
      { status: 400 }
    );
  }
  if (mime !== "application/pdf" || !/\.pdf$/i.test(name)) {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  const folder = await resolveFolder(docType);
  if (!folder) {
    return NextResponse.json(
      {
        error:
          "No Drive folder is set for this document. Super Admin must set it in the Admin Portal → Folder settings.",
      },
      { status: 400 }
    );
  }

  try {
    let parentId = folder.id;
    let fileName = name;
    const safeLabel = caseLabel.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);

    if (safeLabel) {
      if (folder.specific) {
        // Dedicated folder for this report type: keep it flat and put the
        // case label in the file name so files are easy to find.
        fileName = `${safeLabel} - ${name}`;
      } else {
        // General fallback folder: keep the old per-case subfolder behaviour.
        parentId = (await createFolder(auth, safeLabel, parentId)).id;
      }
    }

    const origin = req.headers.get("origin") || new URL(req.url).origin;

    const uploadUrl = await startResumableSession(auth, {
      name: fileName,
      parentId,
      mimeType: "application/pdf",
      size,
      origin,
    });

    return NextResponse.json({ uploadUrl, folderId: parentId });
  } catch (e) {
    const msg = (e as Error).message || "Could not start upload";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
