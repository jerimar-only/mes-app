import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { uploadBuffer, createFolder } from "@/lib/drive";
import {
  authedClient,
  getSetting,
} from "@/lib/googleSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Upload a case document to Google Drive.
 * Form fields:
 *   - file (required)
 *   - caseLabel (optional) — creates/uses a subfolder named after the case
 *   - folderId (optional) — override parent; defaults to Settings parent folder
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

  const parentFromSettings = await getSetting("parentFolderId");
  const form = await req.formData();
  const file = form.get("file");
  const caseLabel = String(form.get("caseLabel") ?? "").trim();
  const folderOverride = String(form.get("folderId") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 50 MB)" },
      { status: 400 }
    );
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime) && !mime.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only PDF, images, or Word documents are allowed" },
      { status: 400 }
    );
  }

  let parentId = folderOverride || parentFromSettings;
  if (!parentId) {
    return NextResponse.json(
      {
        error:
          "No parent Drive folder is set. Super Admin must save a parent folder in Settings.",
      },
      { status: 400 }
    );
  }

  try {
    // Optional: put files under a per-case subfolder
    if (caseLabel) {
      const safe = caseLabel.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
      const folder = await createFolder(auth, safe, parentId);
      parentId = folder.id;
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const result = await uploadBuffer(auth, buf, file.name, parentId, mime);

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
