import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  permissions,
  getAllowedCenroOfficeIds,
  type AuthUser,
  type Role,
} from "@/lib/permissions";

export type OfficeScope = {
  role: Role;
  userId: number;
  /** True when the signed-in user is a CENRO portal account */
  isCenro: boolean;
  /** Forced office id for CENRO users; null for provincial staff */
  officeId: number | null;
  officeName: string | null;
  /**
   * CENRO offices this user may see / change.
   * null = all offices; [] = none (e.g. misconfigured account).
   * PENRO admins get every CENRO under their PENRO.
   */
  allowedOfficeIds: number[] | null;
};

/**
 * Resolve the current user's office scope.
 * CENRO accounts are always locked to their assigned office.
 */
export async function getOfficeScope(): Promise<OfficeScope | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      cenroOfficeId: true,
      penroOfficeId: true,
      cenroOffice: { select: { name: true } },
    },
  });

  if (!user || !user.isActive) return null;

  const role = user.role as Role;
  const allowedOfficeIds = await getAllowedCenroOfficeIds(user as unknown as AuthUser);
  const isCenro = permissions.isCenro(role);
  const officeId =
    isCenro && user.cenroOfficeId != null ? user.cenroOfficeId : null;

  return {
    role,
    userId: user.id,
    isCenro,
    officeId,
    officeName: officeId ? user.cenroOffice?.name ?? null : null,
    allowedOfficeIds,
  };
}

/** True when the scope may work with records of this CENRO office. */
export function canAccessOffice(
  scope: OfficeScope | null,
  officeId: number
): boolean {
  if (!scope) return false;
  if (scope.allowedOfficeIds === null) return true;
  return scope.allowedOfficeIds.includes(officeId);
}

/** Throws unless the signed-in user may access this record's CENRO office. */
export async function assertRecordAccess(recordId: number): Promise<void> {
  const scope = await getOfficeScope();
  if (!scope) throw new Error("Unauthorized");
  if (scope.allowedOfficeIds === null) return;

  const rec = await prisma.apprehensionRecord.findUnique({
    where: { id: recordId },
    select: { cenroOfficeId: true },
  });
  if (!rec) throw new Error("Record not found.");
  if (!scope.allowedOfficeIds.includes(rec.cenroOfficeId)) {
    throw new Error("You don't have access to records of this office.");
  }
}

/**
 * Apply office lock to a filter object / search params style map.
 * Mutates nothing — returns the office id that must be used (or undefined).
 */
export function forcedOfficeId(
  scope: OfficeScope | null,
  requestedOffice?: string | number | null
): number | undefined {
  if (scope?.isCenro && scope.officeId != null) {
    return scope.officeId;
  }
  if (requestedOffice == null || requestedOffice === "") return undefined;
  const n =
    typeof requestedOffice === "number"
      ? requestedOffice
      : parseInt(String(requestedOffice), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
