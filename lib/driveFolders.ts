/**
 * Per-document-type Google Drive folders.
 *
 * Each report type (case documents, appraisal, deed of donation, terminal
 * report) can have its own Drive folder, set by the Super Admin. If a type has
 * no folder of its own, uploads fall back to the general parent folder
 * (`parentFolderId`).
 */
import { getSetting } from "@/lib/googleSettings";

export const DOC_TYPES = [
  {
    key: "caseDocuments",
    label: "Case documents",
    description: "Case scans / PDFs attached to the record.",
    recordField: "caseDocumentsUrl",
  },
  {
    key: "appraisalReport",
    label: "Appraisal report",
    description: "Appraisal reports for forest products, conveyances, equipment.",
    recordField: "appraisalReportUrl",
  },
  {
    key: "deedOfDonation",
    label: "Deed of donation",
    description: "Deeds of donation (only when a donation was made).",
    recordField: "deedOfDonationUrl",
  },
  {
    key: "terminalReport",
    label: "Terminal report",
    description: "Terminal reports (only when a donation was made).",
    recordField: "terminalReportUrl",
  },
] as const;

export type DocTypeKey = (typeof DOC_TYPES)[number]["key"];

export function isDocType(v: unknown): v is DocTypeKey {
  return DOC_TYPES.some((d) => d.key === v);
}

/** Settings-table key that stores the folder ID for a document type. */
export function folderSettingKey(docType: DocTypeKey): string {
  return `folder:${docType}`;
}

/**
 * Folder to upload a document type into: its own folder if set, otherwise the
 * general parent folder. Returns `{ id, specific }`, or null if neither is set.
 */
export async function resolveFolder(
  docType: DocTypeKey
): Promise<{ id: string; specific: boolean } | null> {
  const own = await getSetting(folderSettingKey(docType));
  if (own) return { id: own, specific: true };
  const parent = await getSetting("parentFolderId");
  return parent ? { id: parent, specific: false } : null;
}
