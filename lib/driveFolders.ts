/**
 * Document types + Drive folder helpers.
 * Works with the new DriveFolder model (per-PENRO / per-CENRO folders managed by SA).
 */
import { prisma } from "@/lib/prisma";
import { FolderType } from "@prisma/client";
import { getSetting } from "@/lib/googleSettings";

export const DOC_TYPES = [
  {
    key: "caseDocuments",
    label: "Case Documents",
    description: "Case scans / PDFs attached to an apprehension record.",
  },
  {
    key: "appraisalReport",
    label: "Appraisal Report",
    description: "Appraisal report PDFs.",
  },
  {
    key: "deedOfDonation",
    label: "Deed of Donation",
    description: "Deed of donation PDFs.",
  },
  {
    key: "terminalReport",
    label: "Terminal Report",
    description: "Terminal report PDFs.",
  },
] as const;

export type DocTypeKey = (typeof DOC_TYPES)[number]["key"];

export function isDocType(v: unknown): v is DocTypeKey {
  return DOC_TYPES.some((d) => d.key === v);
}

export function docTypeLabel(k: DocTypeKey): string {
  return DOC_TYPES.find((d) => d.key === k)!.label;
}

/**
 * Key in the `Setting` table that stores the global Drive folder for a
 * document type (Admin Portal → Folder settings).
 */
export function folderSettingKey(k: DocTypeKey): string {
  return `folder_${k}`;
}

export type ResolvedFolder = {
  /** Drive folder ID to upload into */
  id: string;
  /**
   * true  → a dedicated folder (per-office or per-doc-type): keep it flat and
   *         put the case label in the file name.
   * false → the general parent folder: create a per-case subfolder.
   */
  specific: boolean;
};

/**
 * Resolve the Drive folder for an upload.
 * Priority:
 *   1. Per-office folder set by the Super Admin (CENRO → PENRO → ROOT),
 *      only when `opts.cenroOfficeId` / `opts.penroOfficeId` is given
 *   2. Global folder for this document type (Setting table)
 *   3. General parent folder (Setting "parentFolderId")
 */
export async function resolveFolder(
  docType: DocTypeKey,
  opts: { cenroOfficeId?: number | null; penroOfficeId?: number | null } = {}
): Promise<ResolvedFolder | null> {
  if (opts.cenroOfficeId || opts.penroOfficeId) {
    const officeFolder = await resolveUploadFolderId(opts);
    if (officeFolder) return { id: officeFolder, specific: true };
  }

  const typed = await getSetting(folderSettingKey(docType));
  if (typed) return { id: typed, specific: true };

  const parent = await getSetting("parentFolderId");
  if (parent) return { id: parent, specific: false };

  return null;
}

/** Make a docket number / name safe to use as a Drive folder / file name. */
export function safeName(s: string, max = 80): string {
  return s.replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, max);
}

/**
 * Resolve the correct Google Drive folder ID for a given CENRO (or its parent PENRO).
 * Priority: CENRO folder → parent PENRO folder → ROOT folder.
 */
export async function resolveUploadFolderId(opts: {
  cenroOfficeId?: number | null;
  penroOfficeId?: number | null;
}): Promise<string | null> {
  const { cenroOfficeId, penroOfficeId } = opts;

  // 1. Prefer a folder explicitly linked to this CENRO
  if (cenroOfficeId) {
    const cenroFolder = await prisma.driveFolder.findFirst({
      where: {
        type: FolderType.CENRO,
        cenroOfficeId,
        isActive: true,
      },
      select: { driveId: true },
    });
    if (cenroFolder?.driveId) return cenroFolder.driveId;
  }

  // 2. Fall back to the parent PENRO folder
  let resolvedPenroId = penroOfficeId ?? null;
  if (!resolvedPenroId && cenroOfficeId) {
    const cenro = await prisma.cenroOffice.findUnique({
      where: { id: cenroOfficeId },
      select: { penroOfficeId: true },
    });
    resolvedPenroId = cenro?.penroOfficeId ?? null;
  }

  if (resolvedPenroId) {
    const penroFolder = await prisma.driveFolder.findFirst({
      where: {
        type: FolderType.PENRO,
        penroOfficeId: resolvedPenroId,
        isActive: true,
      },
      select: { driveId: true },
    });
    if (penroFolder?.driveId) return penroFolder.driveId;
  }

  // 3. Fall back to ROOT
  const root = await prisma.driveFolder.findFirst({
    where: { type: FolderType.ROOT, isActive: true },
    select: { driveId: true },
  });
  return root?.driveId ?? null;
}

/**
 * List all DriveFolder rows (for SA management page).
 */
export async function listDriveFolders() {
  return prisma.driveFolder.findMany({
    include: {
      penroOffice: { select: { id: true, name: true } },
      cenroOffice: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

/**
 * Create or update a DriveFolder mapping (SA only).
 */
export async function upsertDriveFolder(data: {
  id?: number;
  name: string;
  driveId: string;
  type: FolderType;
  penroOfficeId?: number | null;
  cenroOfficeId?: number | null;
  parentId?: number | null;
  isActive?: boolean;
}) {
  if (data.id) {
    return prisma.driveFolder.update({
      where: { id: data.id },
      data: {
        name: data.name,
        driveId: data.driveId,
        type: data.type,
        penroOfficeId: data.penroOfficeId ?? null,
        cenroOfficeId: data.cenroOfficeId ?? null,
        parentId: data.parentId ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  return prisma.driveFolder.create({
    data: {
      name: data.name,
      driveId: data.driveId,
      type: data.type,
      penroOfficeId: data.penroOfficeId ?? null,
      cenroOfficeId: data.cenroOfficeId ?? null,
      parentId: data.parentId ?? null,
      isActive: data.isActive ?? true,
    },
  });
}
