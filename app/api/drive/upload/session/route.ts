import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { startResumableSession, findOrCreateRecordFolder } from "@/lib/drive";
import {
  isDocType,
  resolveFolder,
  docTypeLabel,
  safeName,
} from "@/lib/driveFolders";
import { authedClient } from "@/lib/googleSettings";
import { prisma } from "@/lib/prisma";
import { assertRecordAccess } from "@/lib/officeScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Step 1 of a direct-to-Drive upload.
 * Body (JSON): { name, mimeType, size, docType, recordId, cenroOfficeId?, penroOfficeId? }
 * Returns:     { uploadUrl, folderId }
 *
 * Uploads are only for SAVED records that already have a docket number: every document
 * of the record goes to one Drive subfolder named after it. Folder resolution for the
 * parent: CENRO office folder → PENRO → ROOT → legacy doc-type / parent.
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
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    mimeType?: string;
    size?: number;
    docType?: string;
    recordId?: number | string | null;
    cenroOfficeId?: number | string | null;
    penroOfficeId?: number | string | null;
  } | null;

  const name = String(body?.name ?? "").trim();
  const mime = String(body?.mimeType ?? "").trim();
  const size = Number(body?.size);
  const docType = body?.docType ?? "caseDocuments";
  const recordId = body?.recordId ? parseInt(String(body.recordId), 10) : null;

  const cenroOfficeId = body?.cenroOfficeId
    ? parseInt(String(body.cenroOfficeId), 10)
    : null;
  const penroOfficeId = body?.penroOfficeId
    ? parseInt(String(body.penroOfficeId), 10)
    : null;

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
      { status: 400 },
    );
  }
  if (mime !== "application/pdf" || !/\.pdf$/i.test(name)) {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 },
    );
  }

  // Saved record with a docket number is required.
  if (!recordId || !Number.isFinite(recordId) || recordId <= 0) {
    return NextResponse.json(
      { error: "Save the record first, then upload documents from Edit record." },
      { status: 400 },
    );
  }
  try {
    await assertRecordAccess(recordId);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Forbidden" },
      { status: 403 },
    );
  }
  const rec = await prisma.apprehensionRecord.findUnique({
    where: { id: recordId },
    select: { docketNumber: true, isDeleted: true },
  });
  if (!rec) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  if (rec.isDeleted) {
    return NextResponse.json({ error: "This record is deleted" }, { status: 400 });
  }
  const docket = safeName(rec.docketNumber || "");
  if (!docket) {
    return NextResponse.json(
      { error: "Add a Docket no. to this record and save it before uploading." },
      { status: 400 },
    );
  }
  const recordFolderName = `${docket} (ID ${recordId})`;

  const folder = await resolveFolder(docType, {
    cenroOfficeId: Number.isFinite(cenroOfficeId as number) ? cenroOfficeId : null,
    penroOfficeId: Number.isFinite(penroOfficeId as number) ? penroOfficeId : null,
  });
  if (!folder) {
    return NextResponse.json(
      {
        error:
          "No Drive folder is set. Super Admin must map a PENRO/CENRO/ROOT folder in Admin Portal → Folder settings.",
      },
      { status: 400 },
    );
  }

  try {
    const parentId = (
      await findOrCreateRecordFolder(auth, {
        recordId,
        name: recordFolderName,
        parentId: folder.id,
      })
    ).id;
    const fileName = `${docTypeLabel(docType)} - ${name}`;

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
