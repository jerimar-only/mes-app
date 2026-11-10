import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { uploadBuffer, createFolder } from "@/lib/drive";
import { isDocType, resolveFolder } from "@/lib/driveFolders";
import { authedClient } from "@/lib/googleSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Upload a case document to Google Drive.
 * Form fields:
 *   - file (required, PDF only)
 *   - docType (optional, default caseDocuments) — picks the Folder Settings target
 *   - caseLabel (optional) — prefixes the file name (or subfolder if no dedicated folder)
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.role as Role;
  // Same roles that can create/edit records may attach docs
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

  const form = await req.formData();
  const file = form.get("file");
  const caseLabel = String(form.get("caseLabel") ?? "").trim();
  const docType = String(form.get("docType") ?? "caseDocuments");
  if (!isDocType(docType)) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 50 MB)" },
      { status: 400 }
    );
  }
  const mime = file.type;
  if (mime !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
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
  let parentId = folder.id;

  try {
    let fileName = file.name;
    if (caseLabel) {
      const safe = caseLabel.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
      if (folder.specific) {
        fileName = `${safe} - ${file.name}`;
      } else {
        parentId = (await createFolder(auth, safe, parentId)).id;
      }
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const result = await uploadBuffer(auth, buf, fileName, parentId, mime);

    return NextResponse.json({
      id: result.id,
      name: result.name,
      webViewLink: result.webViewLink ?? null,
      folderId: parentId,
    });
  } catch (e) {
    const msg = (e as Error).message || "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
