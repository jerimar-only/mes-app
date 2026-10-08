export type Role = "SUPERADMIN" | "ADMINISTRATOR" | "ENCODER";

export const permissions = {
  manageUsers: (role: Role) => role === "SUPERADMIN",

  editSavedRecord: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR",

  viewRecords: (_role: Role) => true,

  createRecord: (role: Role) =>
    role === "SUPERADMIN" || role === "ADMINISTRATOR" || role === "ENCODER",
};