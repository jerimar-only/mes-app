/**
 * Google Drive helpers for MES case documents.
 * Adapted from the PDF merger (resumable upload + folder ID parsing).
 */
import { google, type drive_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export type DriveFile = {
  id: string;
  name: string;
  webViewLink?: string;
};

type Auth = OAuth2Client;

/** Accept a full Drive folder URL or a bare folder ID. */
export function extractFolderId(input: string): string {
  const s = (input || "").trim();
  const m =
    s.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
    s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : s;
}

function assertId(id: string) {
  if (!/^[\w-]{10,}$/.test(id)) {
    throw new Error("Invalid Google Drive folder or file ID");
  }
}

async function driveError(res: Response): Promise<Error> {
  let reason = "";
  let detail = "";
  try {
    const body = (await res.json()) as {
      error?: {
        message?: string;
        status?: string;
        errors?: { reason?: string }[];
      };
    };
    reason = body.error?.errors?.[0]?.reason ?? body.error?.status ?? "";
    detail = body.error?.message ?? "";
  } catch {
    // ignore
  }

  let msg: string;
  if (res.status === 401) {
    msg = "Google sign-in expired. Reconnect Google in Settings.";
  } else if (/storageQuotaExceeded/i.test(reason)) {
    msg = "Google Drive is full. Free up space, then try again.";
  } else if (/rateLimit|quota/i.test(reason)) {
    msg = "Google is rate-limiting requests. Wait a minute and try again.";
  } else if (
    /insufficientScopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(reason + detail)
  ) {
    msg =
      "Google permission is missing. Disconnect, then Connect Google again in Settings.";
  } else if (res.status === 403) {
    msg =
      "Drive folder is locked or you do not have Editor access. Share the parent folder with the connected Google account.";
  } else if (res.status === 404) {
    msg =
      "That Drive folder was not found. It may have been moved or deleted.";
  } else {
    msg = `Drive rejected the upload (${res.status}${reason ? `: ${reason}` : ""}).`;
  }
  return Object.assign(new Error(msg), { fatal: true as const });
}

const UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files";
const CHUNK = 8 * 1024 * 1024; // 8 MiB (multiple of 256 KiB)

/**
 * Upload a buffer to Google Drive under parentId.
 * Uses resumable upload so large PDFs/scans are reliable.
 */
export async function uploadBuffer(
  auth: Auth,
  data: Buffer,
  name: string,
  parentId: string,
  mimeType = "application/pdf",
  onProgress?: (sent: number, total: number) => void
): Promise<DriveFile> {
  assertId(parentId);
  const total = data.byteLength;
  if (total === 0) throw new Error("File is empty");

  const accessToken = (await auth.getAccessToken()).token;
  if (!accessToken) {
    throw new Error("Google sign-in expired. Reconnect Google in Settings.");
  }

  // 1) Start resumable session
  const init = await fetch(
    `${UPLOAD_ENDPOINT}?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(total),
      },
      body: JSON.stringify({ name, parents: [parentId] }),
    }
  );
  if ([400, 401, 403, 404].includes(init.status)) throw await driveError(init);
  if (!init.ok) throw new Error(`Could not start upload (${init.status})`);
  const session = init.headers.get("location");
  if (!session) throw new Error("Could not start the upload session.");

  // 2) Send in chunks
  let offset = 0;
  while (offset < total) {
    const end = Math.min(offset + CHUNK, total);
    const chunk = data.subarray(offset, end);
    const res = await fetch(session, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes ${offset}-${end - 1}/${total}`,
        "Content-Length": String(chunk.byteLength),
      },
      body: new Uint8Array(chunk),
    });

    if (res.status === 200 || res.status === 201) {
      onProgress?.(total, total);
      return (await res.json()) as DriveFile;
    }
    if (res.status === 308) {
      const range = res.headers.get("range"); // bytes=0-12345
      offset = range ? parseInt(range.split("-")[1], 10) + 1 : end;
      onProgress?.(offset, total);
      continue;
    }
    throw await driveError(res);
  }

  throw new Error("Upload finished without a Drive file response.");
}

/**
 * Open a resumable upload session and return its upload URL, WITHOUT sending
 * any file bytes. The browser then uploads the file straight to Google using
 * that URL, so the file never passes through the serverless function (which
 * is capped at ~4.5 MB per request on Vercel).
 *
 * `origin` must be the web page's origin; Google uses it to allow the
 * browser's cross-origin (CORS) PUT to the session URL.
 */
export async function startResumableSession(
  auth: Auth,
  opts: {
    name: string;
    parentId: string;
    mimeType: string;
    size: number;
    origin: string;
  }
): Promise<string> {
  assertId(opts.parentId);
  if (!(opts.size > 0)) throw new Error("File is empty");

  const accessToken = (await auth.getAccessToken()).token;
  if (!accessToken) {
    throw new Error("Google sign-in expired. Reconnect Google in Settings.");
  }

  const init = await fetch(
    `${UPLOAD_ENDPOINT}?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": opts.mimeType,
        "X-Upload-Content-Length": String(opts.size),
        Origin: opts.origin,
      },
      body: JSON.stringify({ name: opts.name, parents: [opts.parentId] }),
    }
  );
  if ([400, 401, 403, 404].includes(init.status)) throw await driveError(init);
  if (!init.ok) throw new Error(`Could not start upload (${init.status})`);
  const session = init.headers.get("location");
  if (!session) throw new Error("Could not start the upload session.");
  return session;
}

/** Create a subfolder under parentId (e.g. one folder per case). */
export async function createFolder(
  auth: Auth,
  name: string,
  parentId: string
): Promise<DriveFile> {
  assertId(parentId);
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });
  if (!res.data.id) throw new Error("Could not create Drive folder");
  return {
    id: res.data.id,
    name: res.data.name ?? name,
    webViewLink: res.data.webViewLink ?? undefined,
  };
}

/**
 * One Drive folder per saved apprehension record. The folder is tagged with the record id
 * (appProperties), so every document of the same record goes to the same folder even if
 * the docket number is changed later. Created on the first upload, reused afterwards, and
 * renamed when its readable name (docket number) is out of date.
 */
export async function findOrCreateRecordFolder(
  auth: Auth,
  opts: { recordId: number; name: string; parentId: string }
): Promise<DriveFile> {
  assertId(opts.parentId);
  const drive = google.drive({ version: "v3", auth });
  const key = String(Math.trunc(opts.recordId));

  const found = await drive.files.list({
    q: `appProperties has { key='emsRecordId' and value='${key}' } and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name,webViewLink)",
    pageSize: 1,
    corpora: "allDrives",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const existing = found.data.files?.[0];
  if (existing?.id) {
    if (existing.name !== opts.name) {
      try {
        await drive.files.update({
          fileId: existing.id,
          requestBody: { name: opts.name },
          supportsAllDrives: true,
        });
      } catch {
        // renaming is cosmetic; keep going
      }
    }
    return {
      id: existing.id,
      name: opts.name,
      webViewLink: existing.webViewLink ?? undefined,
    };
  }

  const res = await drive.files.create({
    requestBody: {
      name: opts.name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [opts.parentId],
      appProperties: { emsRecordId: key },
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true,
  });
  if (!res.data.id) throw new Error("Could not create the record's Drive folder");
  return {
    id: res.data.id,
    name: res.data.name ?? opts.name,
    webViewLink: res.data.webViewLink ?? undefined,
  };
}

export type DriveClient = drive_v3.Drive;

/** List files in a Drive folder (non-recursive). SA folder browser. */
export async function listFolderFiles(
  auth: Auth,
  folderId: string,
  pageSize = 100,
): Promise<{ id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string; size?: string }[]> {
  assertId(folderId);
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    pageSize: Math.min(200, Math.max(1, pageSize)),
    fields:
      "files(id,name,mimeType,modifiedTime,webViewLink,size)",
    orderBy: "modifiedTime desc",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name ?? "(unnamed)",
    mimeType: f.mimeType ?? "application/octet-stream",
    modifiedTime: f.modifiedTime ?? undefined,
    webViewLink: f.webViewLink ?? undefined,
    size: f.size ?? undefined,
  }));
}

/** Permanently delete a file in Google Drive (SA only). */
export async function deleteDriveFile(auth: Auth, fileId: string): Promise<void> {
  assertId(fileId);
  const drive = google.drive({ version: "v3", auth });
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}
