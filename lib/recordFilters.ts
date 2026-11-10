import type { Prisma } from "@prisma/client";

// Statuses that count as a "resolved case" (used by the dashboard and the full view)
export const RESOLVED_STATUSES = ["CONFISCATED", "DONATED", "RELEASED"] as const;

/** Display label for any stored status value */
export const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For Donation",
  UNDER_ADJUDICATION: "For Appraisal",
  CONFISCATED: "Donated",
  DONATED: "Donated",
  RELEASED: "Donated",
  UNKNOWN: "For Appraisal",
};

/**
 * Filter dropdown options (unique labels).
 * Selecting one expands to all matching DB enum values via STATUS_GROUPS.
 */
export const STATUS_FILTER_OPTIONS = [
  { value: "FOR_RESOLUTION", label: "For Donation" },
  { value: "UNDER_ADJUDICATION", label: "For Appraisal" },
  { value: "DONATED", label: "Donated" },
] as const;

/** Map a filter value (or raw status) to the set of DB statuses it should match */
export const STATUS_GROUPS: Record<string, string[]> = {
  FOR_RESOLUTION: ["FOR_RESOLUTION"],
  UNDER_ADJUDICATION: ["UNDER_ADJUDICATION", "UNKNOWN"],
  DONATED: ["DONATED", "CONFISCATED", "RELEASED"],
  // allow drilling down by exact legacy values too
  CONFISCATED: ["CONFISCATED"],
  RELEASED: ["RELEASED"],
  UNKNOWN: ["UNKNOWN"],
};

export function statusesForFilter(status: string | undefined | null): string[] | null {
  if (!status) return null;
  return STATUS_GROUPS[status] ?? [status];
}

export type RecordFilterParams = {
  q?: string;
  year?: string;
  office?: string;
  status?: string;
  deleted?: string;
  acp?: string; // "penro" | "ro" | "todo"
  conv?: string; // "1" = has conveyance / chainsaw
  resolved?: string; // "1" = resolved cases only
};

export function buildRecordWhere(params: RecordFilterParams): Prisma.ApprehensionRecordWhereInput {
  const and: Prisma.ApprehensionRecordWhereInput[] = [];

  if (params.acp === "penro") and.push({ acpEndorsedToPenro: { not: null } });
  if (params.acp === "ro") and.push({ acpEndorsedToRo: { not: null } });
  if (params.acp === "todo") {
    and.push({ acpEndorsedToPenro: null, status: { notIn: [...RESOLVED_STATUSES] } });
  }
  if (params.conv === "1") {
    and.push({
      OR: [
        { conveyances: { some: {} } },
        { equipment: { some: { type: { contains: "chainsaw", mode: "insensitive" } } } },
        { equipment: { some: { type: { contains: "chain saw", mode: "insensitive" } } } },
      ],
    });
  }
  if (params.resolved === "1") and.push({ status: { in: [...RESOLVED_STATUSES] } });

  const statusList = statusesForFilter(params.status);

  return {
    ...(params.deleted === "only"
      ? { isDeleted: true }
      : params.deleted === "all"
      ? {}
      : { isDeleted: false }),
    ...(params.year ? { year: parseInt(params.year, 10) } : {}),
    ...(params.office
      ? {
          cenroOfficeId: {
            in: params.office
              .split(",")
              .map((s) => parseInt(s, 10))
              .filter((n) => !Number.isNaN(n)),
          },
        }
      : {}),
    ...(statusList
      ? statusList.length === 1
        ? { status: statusList[0] as any }
        : { status: { in: statusList as any } }
      : {}),
    ...(params.q
      ? {
          OR: [
            { placeOfApprehension: { contains: params.q, mode: "insensitive" } },
            { sourcePlace: { contains: params.q, mode: "insensitive" } },
            { claimantRespondent: { contains: params.q, mode: "insensitive" } },
            { apprehendingAgency: { contains: params.q, mode: "insensitive" } },
            { circumstances: { contains: params.q, mode: "insensitive" } },
            { docketNumber: { contains: params.q, mode: "insensitive" } },
            { remarks: { contains: params.q, mode: "insensitive" } },
            { otherRemarks: { contains: params.q, mode: "insensitive" } },
            { caseStatus: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(and.length ? { AND: and } : {}),
  };
}
