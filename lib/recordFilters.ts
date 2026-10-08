import type { Prisma } from "@prisma/client";

// Statuses that count as a "resolved case" (used by the dashboard and the full view)
export const RESOLVED_STATUSES = ["CONFISCATED", "DONATED", "RELEASED"] as const;

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
    ...(params.status ? { status: params.status as any } : {}),
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