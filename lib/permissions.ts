export type Role = "SUPERADMIN" | "ADMINISTRATOR" | "ENCODER";

/**
 * Delete / edit policy:
 * - Edit saved records: SUPERADMIN + ADMINISTRATOR + ENCODER
 * - Soft delete / restore: SUPERADMIN + ADMINISTRATOR + ENCODER
 * - Permanent delete (row removed): SUPERADMIN only, and only after soft-delete
 * - Manage users / upload Excel: admin-level only
 */
export const permissions = {
  manageUsers: (role: Role) => role === "SUPERADMIN",

  editSavedRecord: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR" || role === "ENCODER",

  // soft delete (record is hidden and can be restored)
  softDeleteRecord: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR" || role === "ENCODER",

  // permanent delete (cannot be undone) — Super Admin only
  permanentDeleteRecord: (role: Role) => role === "SUPERADMIN",

  viewRecords: (_role: Role) => true,

  createRecord: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR" || role === "ENCODER",

  // used by export routes
  printRecords: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR" || role === "ENCODER",

  // used by upload/actions.ts
  uploadExcel: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR",
};
