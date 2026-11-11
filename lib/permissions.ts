import type { User, PenroOffice, CenroOffice, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Role string union (mirrors the Prisma `UserRole` enum). */
export type Role = UserRole;

const ALL_ROLES: readonly Role[] = [
  "SUPERADMIN",
  "ADMINISTRATOR",
  "PENRO_ADMIN",
  "CENRO_ADMIN",
  "ENCODER",
  "CENRO",
  "REGIONAL",
];

const rolesOf = (...r: Role[]) => new Set<string>(r);

const CREATE_ROLES = rolesOf(
  "SUPERADMIN", "ADMINISTRATOR", "PENRO_ADMIN", "CENRO_ADMIN", "CENRO", "ENCODER"
);
const EDIT_ROLES = CREATE_ROLES;
const SOFT_DELETE_ROLES = rolesOf(
  "SUPERADMIN", "ADMINISTRATOR", "PENRO_ADMIN", "CENRO_ADMIN", "CENRO"
);
const PERMANENT_DELETE_ROLES = rolesOf("SUPERADMIN");
/** Export to Excel: Regional Office and Super Admin only. */
const EXPORT_ROLES = rolesOf("SUPERADMIN", "REGIONAL");
const PRINT_ROLES = new Set<string>(ALL_ROLES); // REGIONAL can view/print too

/**
 * Role-level capability checks used by pages, server actions and API routes.
 * These only answer "may this ROLE do X at all?". Office/PENRO scoping
 * (the AOR) is enforced separately via buildAorWhere / canAccessRecord /
 * getOfficeScope.
 */
export const permissions = {
  createRecord: (role: Role | string) => CREATE_ROLES.has(role),
  editSavedRecord: (role: Role | string) => EDIT_ROLES.has(role),
  softDeleteRecord: (role: Role | string) => SOFT_DELETE_ROLES.has(role),
  permanentDeleteRecord: (role: Role | string) => PERMANENT_DELETE_ROLES.has(role),
  exportExcel: (role: Role | string) => EXPORT_ROLES.has(role),
  printRecords: (role: Role | string) => PRINT_ROLES.has(role),
  uploadExcel: (role: Role | string) => CREATE_ROLES.has(role),
  /** Docket number: anyone may set it while it is empty; once set, only the Super Admin may change it. */
  changeDocketNumber: (role: Role | string, current?: string | null) =>
    role === "SUPERADMIN" || !(current ?? "").trim(),
  /** Accounts locked to exactly one CENRO office. */
  isCenro: (role: Role | string) => role === "CENRO" || role === "CENRO_ADMIN",
} as const;

export type AuthUser = User & {
  penroOffice?: PenroOffice | null;
  cenroOffice?: CenroOffice | null;
};

export interface Permissions {
  canViewAll: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canBulk: boolean;
  canComment: boolean;
  canManageFolders: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  isRegional: boolean;
  isSuperAdmin: boolean;
  isPenroAdmin: boolean;
  isCenroAdmin: boolean;
}

/**
 * Returns the permission flags for a user
 */
export function getPermissions(user: AuthUser): Permissions {
  const role = user.role;

  const isSuperAdmin = role === "SUPERADMIN";
  const isRegional = role === "REGIONAL";
  const isPenroAdmin = role === "PENRO_ADMIN";
  const isCenroAdmin = role === "CENRO_ADMIN" || role === "CENRO";
  const isAdministrator = role === "ADMINISTRATOR";

  return {
    canViewAll: isSuperAdmin || isRegional || isAdministrator,
    canEdit: isSuperAdmin || isPenroAdmin || isCenroAdmin || isAdministrator,
    canDelete: isSuperAdmin || isPenroAdmin || isCenroAdmin || isAdministrator,
    canBulk: isSuperAdmin || isPenroAdmin || isCenroAdmin || isAdministrator,
    canComment: true, // all authenticated users can comment
    canManageFolders: isSuperAdmin,
    canManageUsers: isSuperAdmin,
    canManageSettings: isSuperAdmin,
    isRegional,
    isSuperAdmin,
    isPenroAdmin,
    isCenroAdmin,
  };
}

/**
 * Returns the list of allowed CenroOffice IDs for the current user.
 * - SUPERADMIN / REGIONAL / ADMINISTRATOR → null (meaning "all")
 * - PENRO_ADMIN → all CENROs under their Penro
 * - CENRO_ADMIN / CENRO → only their own CenroOffice
 * - ENCODER → own CenroOffice if assigned, otherwise null (all)
 */
export async function getAllowedCenroOfficeIds(
  user: AuthUser
): Promise<number[] | null> {
  const { role, penroOfficeId, cenroOfficeId } = user;

  // Full access roles
  if (
    role === "SUPERADMIN" ||
    role === "REGIONAL" ||
    role === "ADMINISTRATOR"
  ) {
    return null; // null = no filter (see all)
  }

  // PENRO_ADMIN → all child CENROs
  if (role === "PENRO_ADMIN") {
    if (!penroOfficeId) return []; // misconfigured user

    const cenros = await prisma.cenroOffice.findMany({
      where: { penroOfficeId },
      select: { id: true },
    });

    return cenros.map((c) => c.id);
  }

  // CENRO_ADMIN / CENRO → only their office (none if misconfigured)
  if (role === "CENRO_ADMIN" || role === "CENRO") {
    return cenroOfficeId ? [cenroOfficeId] : [];
  }

  // ENCODER → own office when one is assigned, otherwise province-wide
  // (encoder accounts are normally created without an office)
  if (role === "ENCODER") {
    return cenroOfficeId ? [cenroOfficeId] : null;
  }

  return [];
}

/**
 * Combine the offices a user is allowed to see (`allowed`, null = all) with
 * the offices a request asks for (`requested`, null = no filter).
 * Returns null for "no restriction", or the list of permitted ids
 * (an empty list means "nothing").
 */
export function narrowOfficeIds(
  allowed: number[] | null,
  requested: number[] | null
): number[] | null {
  if (allowed === null) return requested;
  if (requested === null) return allowed;
  return requested.filter((id) => allowed.includes(id));
}

/**
 * Returns the allowed PenroOffice names (string) for filtering.
 * Useful because ApprehensionRecord.penroOffice is still a String field.
 */
export async function getAllowedPenroNames(
  user: AuthUser
): Promise<string[] | null> {
  const { role, penroOfficeId, cenroOfficeId } = user;

  if (
    role === "SUPERADMIN" ||
    role === "REGIONAL" ||
    role === "ADMINISTRATOR"
  ) {
    return null; // all
  }

  if (role === "PENRO_ADMIN") {
    if (!penroOfficeId) return [];
    const penro = await prisma.penroOffice.findUnique({
      where: { id: penroOfficeId },
      select: { name: true },
    });
    return penro ? [penro.name] : [];
  }

  // For CENRO-level users we still return the parent PENRO name
  if (cenroOfficeId) {
    const cenro = await prisma.cenroOffice.findUnique({
      where: { id: cenroOfficeId },
      include: { penroOffice: { select: { name: true } } },
    });
    return cenro?.penroOffice?.name ? [cenro.penroOffice.name] : [];
  }

  return [];
}

/**
 * Builds a Prisma `where` clause that restricts records to the user's AOR.
 * Returns `{}` for full-access roles.
 */
export async function buildAorWhere(user: AuthUser) {
  const allowedCenroIds = await getAllowedCenroOfficeIds(user);

  // Full access
  if (allowedCenroIds === null) {
    return {};
  }

  // No access
  if (allowedCenroIds.length === 0) {
    return { id: -1 }; // impossible condition
  }

  return {
    cenroOfficeId: { in: allowedCenroIds },
  };
}

/**
 * Convenience: check if a user can perform an action on a specific record
 */
export async function canAccessRecord(
  user: AuthUser,
  recordCenroOfficeId: number,
  action: "view" | "edit" | "delete" = "view"
): Promise<boolean> {
  const perms = getPermissions(user);

  if (action === "view" && perms.canViewAll) return true;
  if ((action === "edit" || action === "delete") && !perms.canEdit) return false;

  const allowed = await getAllowedCenroOfficeIds(user);
  if (allowed === null) return true; // full access
  return allowed.includes(recordCenroOfficeId);
}
