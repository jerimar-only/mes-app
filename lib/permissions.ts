export type Role = "SUPERADMIN" | "ADMINISTRATOR" | "ENCODER" | "CENRO";

/**
 * Role policy:
 * - SUPERADMIN: full access, permanent delete, manage users
 * - ADMINISTRATOR: edit/soft-delete, bulk tools, upload (no user management)
 * - ENCODER: create/edit/soft-delete all offices (PENRO staff)
 * - CENRO: create/edit/soft-delete/upload **own office only**; no admin/bulk
 */
export const permissions = {
  manageUsers: (role: Role) => role === "SUPERADMIN",

  editSavedRecord: (role: Role) =>
    role === "SUPERADMIN" ||
    role === "ADMINISTRATOR" ||
    role === "ENCODER" ||
    role === "CENRO",

  softDeleteRecord: (role: Role) =>
    role === "SUPERADMIN" ||
    role === "ADMINISTRATOR" ||
    role === "ENCODER" ||
    role === "CENRO",

  permanentDeleteRecord: (role: Role) => role === "SUPERADMIN",

  viewRecords: (_role: Role) => true,

  createRecord: (role: Role) =>
    role === "SUPERADMIN" ||
    role === "ADMINISTRATOR" ||
    role === "ENCODER" ||
    role === "CENRO",

  printRecords: (role: Role) =>
    role === "SUPERADMIN" ||
    role === "ADMINISTRATOR" ||
    role === "ENCODER" ||
    role === "CENRO",

  uploadExcel: (role: Role) =>
    role === "SUPERADMIN" ||
    role === "ADMINISTRATOR" ||
    role === "CENRO",

  viewAllOffices: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR" || role === "ENCODER",

  bulkTools: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR",

  isCenro: (role: Role) => role === "CENRO",
};
